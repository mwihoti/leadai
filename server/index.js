import 'dotenv/config';
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.TELEGRAM_PORT || process.env.SERVER_PORT || 8787);
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const DATA_FILE = path.resolve(process.env.TELEGRAM_DATA_FILE || path.join(__dirname, '..', 'data', 'telegram-store.json'));
const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
const HIGH_SCORE_DEFAULT = 75;
const API_VERSION = 'telegram-link-v2-json-sanitize';

const state = {
  bot: null,
  pollOffset: 0,
  store: { users: {} },
  processing: false,
};

async function loadStore() {
  try {
    state.store = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    if (!state.store.users) state.store.users = {};
  } catch {
    state.store = { users: {} };
    await saveStore();
  }
}

async function saveStore() {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(state.store, null, 2));
}

async function ensureDatabase() {
  if (!sql) return false;
  await sql`
    create table if not exists app_snapshots (
      user_id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;
  return true;
}

async function saveUserSnapshot(user) {
  if (!sql) return null;
  await ensureDatabase();
  const cleanUser = sanitizeForJsonb(user);
  const existingRows = await sql`select data from app_snapshots where user_id = ${user.userId} limit 1`;
  const existing = existingRows[0]?.data || null;
  if (existing?.telegram?.chatId && !cleanUser.telegram?.chatId) {
    cleanUser.telegram = existing.telegram;
  }
  cleanUser.sent = { ...(existing?.sent || {}), ...(cleanUser.sent || {}) };
  cleanUser.commandDoneTaskIds = Array.from(new Set([
    ...((existing?.commandDoneTaskIds || [])),
    ...((cleanUser.commandDoneTaskIds || [])),
  ]));
  const rows = await sql`
    insert into app_snapshots (user_id, data, updated_at)
    values (${cleanUser.userId}, ${JSON.stringify(cleanUser)}, now())
    on conflict (user_id)
    do update set data = excluded.data, updated_at = now()
    returning updated_at
  `;
  return rows[0]?.updated_at || null;
}

function sanitizeForJsonb(value) {
  if (typeof value === 'string') {
    return value.replace(/\u0000/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForJsonb);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitizeForJsonb(item)])
    );
  }
  return value;
}

async function loadUserSnapshot(userId) {
  if (!sql) return null;
  await ensureDatabase();
  const rows = await sql`select data from app_snapshots where user_id = ${userId} limit 1`;
  return rows[0]?.data || null;
}

function getUser(userId) {
  if (!state.store.users[userId]) {
    state.store.users[userId] = {
      userId,
      telegramLinkCode: linkCodeForUserId(userId),
      profile: {},
      settings: defaultSettings(),
      telegram: {},
      tasks: [],
      leads: [],
      messages: [],
      contentReminders: [],
      sent: {},
      commandDoneTaskIds: [],
    };
  }
  return state.store.users[userId];
}

function normalizeLinkCode(value = '') {
  return String(value).trim().replace(/^user_/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function linkCodeForUserId(userId = '') {
  return normalizeLinkCode(userId).slice(0, 8);
}

function defaultSettings() {
  return {
    enabled: true,
    taskReminders: true,
    followUpReminders: true,
    postReminders: true,
    leadAlerts: true,
    dailyTaskReminderTime: '09:00',
    followUpReminderTime: '09:00',
    highScoreThreshold: HIGH_SCORE_DEFAULT,
    timezone: 'local',
  };
}

function mergeSettings(input = {}) {
  return { ...defaultSettings(), ...input };
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function todayISO(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function dueAt(date, time, fallbackTime) {
  if (!date) return null;
  const t = time || fallbackTime || '09:00';
  const normalizedTime = /^\d{2}:\d{2}$/.test(t) ? t : '09:00';
  const parsed = new Date(`${date}T${normalizedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shortId(id) {
  return String(id || '').replace(/-/g, '').slice(0, 8);
}

function leadLabel(lead) {
  const name = lead.name || 'Unnamed lead';
  const company = lead.company ? ` at ${lead.company}` : '';
  return `${name}${company}`;
}

function statusLabel(status = '') {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
}

function formatDateTime(date, time) {
  if (!date) return '';
  const value = time ? `${date}T${time}` : date;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return time ? `${date} ${time}` : String(date);
  return parsed.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: time ? 'short' : undefined,
  });
}

function scoreLabel(score) {
  const value = Number(score || 0);
  if (value >= 80) return `${value}/100 - strong opportunity`;
  if (value >= 60) return `${value}/100 - worth reviewing`;
  if (value > 0) return `${value}/100 - needs careful checking`;
  return 'Not scored yet';
}

function bestMessageForLead(user, leadId) {
  return user.messages.find((m) => m.leadId === leadId && m.messageType === 'follow_up')
    || user.messages.find((m) => m.leadId === leadId && m.messageType === 'first_message')
    || user.messages.find((m) => m.leadId === leadId);
}

function activeLead(lead) {
  return !['won', 'lost', 'archived'].includes(lead.status);
}

function formatTaskReminder(task) {
  return [
    `Linked Lead AI reminder: ${task.title}`,
    '',
    'What this means:',
    task.description ? task.description : 'This is a pending task in your opportunity pipeline.',
    '',
    'What to do next:',
    task.title.toLowerCase().includes('lead')
      ? '- Open Linked Lead AI, review your pipeline, and add or update the most relevant opportunities.'
      : '- Open Linked Lead AI and complete this task while the opportunity is still fresh.',
    `- When you finish, reply: /done ${shortId(task.id)}`,
    '',
    `Task reference: ${shortId(task.id)}`,
  ].filter(Boolean).join('\n');
}

function formatFollowUpReminder(user, lead) {
  const msg = bestMessageForLead(user, lead.id);
  const companyRole = [lead.company, lead.role].filter(Boolean).join(' - ');
  return [
    `Follow-up due: ${leadLabel(lead)}`,
    '',
    'Opportunity details:',
    companyRole ? `- Company / role: ${companyRole}` : '',
    lead.followUpDate ? `- Follow-up date: ${formatDateTime(lead.followUpDate, lead.followUpTime)}` : '',
    `- Pipeline status: ${statusLabel(lead.status)}`,
    `- Match score: ${scoreLabel(lead.score)}`,
    lead.trustLevel ? `- Trust level: ${statusLabel(lead.trustLevel)}` : '',
    lead.opportunityType ? `- Opportunity type: ${statusLabel(lead.opportunityType)}` : '',
    '',
    'Why you are following up:',
    lead.aiSummary ? `- ${lead.aiSummary}` : '',
    lead.suggestedPitch ? `- Pitch angle: ${lead.suggestedPitch}` : '',
    '',
    'Recommended next step:',
    lead.recommendedNextAction ? `- ${lead.recommendedNextAction}` : '- Send a short follow-up asking if the role or opportunity is still open.',
    lead.applyUrl ? `- Application link: ${lead.applyUrl}` : '',
    msg?.body ? `\nSuggested message to send:\n${msg.body}` : '',
  ].filter(Boolean).join('\n');
}

function formatPostReminder(reminder) {
  return [
    `Content reminder: ${reminder.title || reminder.topic || 'Scheduled content'}`,
    '',
    'Post details:',
    `- Platform: ${reminder.platformLabel || reminder.platform}`,
    `- Format: ${statusLabel(reminder.format)}`,
    reminder.scheduledAt ? `- Scheduled time: ${new Date(reminder.scheduledAt).toLocaleString('en-KE')}` : '',
    reminder.topic ? `- Topic: ${reminder.topic}` : '',
    reminder.sourceLink ? `- Source link: ${reminder.sourceLink}` : '',
    '',
    'What to do next:',
    '- Review the draft below so it still sounds like you.',
    '- Add any final personal detail, then publish it on the selected platform.',
    reminder.content ? `\nCopy-ready draft:\n${reminder.content}` : '',
  ].filter(Boolean).join('\n');
}

function formatLeadAlert(lead) {
  return [
    `High-priority opportunity found: ${scoreLabel(lead.score)}`,
    '',
    'Lead details:',
    `- Contact/poster: ${lead.name || 'Unnamed lead'}`,
    lead.company ? `- Company: ${lead.company}` : '',
    lead.role ? `- Role/opportunity: ${lead.role}` : '',
    lead.opportunityType ? `- Type: ${statusLabel(lead.opportunityType)}` : '',
    lead.trustLevel ? `- Trust level: ${statusLabel(lead.trustLevel)}` : '',
    '',
    'Why it matters:',
    lead.aiSummary ? `- ${lead.aiSummary}` : '',
    lead.suggestedPitch ? `- Message angle: ${lead.suggestedPitch}` : '',
    '',
    'Recommended next step:',
    lead.recommendedNextAction ? `- ${lead.recommendedNextAction}` : '- Review the lead in Linked Lead AI and decide whether to apply, DM, or archive it.',
    lead.applyUrl ? `- Application link: ${lead.applyUrl}` : '',
  ].filter(Boolean).join('\n');
}

async function telegram(method, body) {
  if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

async function sendTelegram(user, text) {
  if (!user.settings.enabled || !user.telegram.chatId) return false;
  await telegram('sendMessage', {
    chat_id: user.telegram.chatId,
    text: text.slice(0, 3900),
    disable_web_page_preview: true,
  });
  return true;
}

async function getBotInfo() {
  if (!TOKEN) return null;
  try {
    const bot = await telegram('getMe', {});
    state.bot = bot;
    return bot;
  } catch (err) {
    console.error('Telegram getMe failed:', err.message);
    return null;
  }
}

async function processDueForUser(user, now = new Date()) {
  if (!user.telegram.chatId || !user.settings.enabled) return;
  const settings = mergeSettings(user.settings);
  user.settings = settings;

  if (settings.leadAlerts) {
    for (const lead of user.leads.filter(activeLead)) {
      if ((lead.score || 0) < (settings.highScoreThreshold || HIGH_SCORE_DEFAULT)) continue;
      const key = `lead-alert:${lead.id}:${lead.score}`;
      if (user.sent[key]) continue;
      await sendTelegram(user, formatLeadAlert(lead));
      user.sent[key] = new Date().toISOString();
    }
  }

  if (settings.taskReminders) {
    for (const task of user.tasks.filter((t) => t.status === 'pending')) {
      const target = dueAt(task.dueDate, task.reminderTime, settings.dailyTaskReminderTime);
      if (!target || target > now) continue;
      const key = `task:${task.id}:${task.dueDate}:${task.reminderTime || settings.dailyTaskReminderTime}`;
      if (user.sent[key]) continue;
      await sendTelegram(user, formatTaskReminder(task));
      user.sent[key] = new Date().toISOString();
    }
  }

  if (settings.followUpReminders) {
    for (const lead of user.leads.filter((l) => l.followUpDate && activeLead(l))) {
      const target = dueAt(lead.followUpDate, lead.followUpTime, settings.followUpReminderTime);
      if (!target || target > now) continue;
      const key = `follow-up:${lead.id}:${lead.followUpDate}:${lead.followUpTime || settings.followUpReminderTime}`;
      if (user.sent[key]) continue;
      await sendTelegram(user, formatFollowUpReminder(user, lead));
      user.sent[key] = new Date().toISOString();
    }
  }

  if (settings.postReminders) {
    for (const reminder of user.contentReminders.filter((r) => r.status !== 'sent' && r.status !== 'cancelled')) {
      const target = reminder.scheduledAt ? new Date(reminder.scheduledAt) : null;
      if (!target || Number.isNaN(target.getTime()) || target > now) continue;
      const key = `content:${reminder.id}:${reminder.scheduledAt}`;
      if (user.sent[key]) continue;
      await sendTelegram(user, formatPostReminder(reminder));
      user.sent[key] = new Date().toISOString();
      reminder.status = 'sent';
      reminder.sentAt = new Date().toISOString();
    }
  }
}

async function processAllDue() {
  if (state.processing) return;
  state.processing = true;
  try {
    for (const user of Object.values(state.store.users)) {
      await processDueForUser(user);
    }
    await saveStore();
  } catch (err) {
    console.error('Reminder processing failed:', err.message);
  } finally {
    state.processing = false;
  }
}

function findUserByChat(chatId) {
  return Object.values(state.store.users).find((user) => String(user.telegram.chatId) === String(chatId));
}

function findUserByLinkCode(code) {
  const normalized = normalizeLinkCode(code);
  return Object.values(state.store.users).find((user) => (
    normalizeLinkCode(user.telegramLinkCode) === normalized
    || normalizeLinkCode(user.userId) === normalized
    || linkCodeForUserId(user.userId) === normalized
  ));
}

function todaySummary(user) {
  const today = todayISO();
  const tasks = user.tasks.filter((t) => t.status === 'pending' && t.dueDate <= today);
  const followUps = user.leads.filter((l) => l.followUpDate && l.followUpDate <= today && activeLead(l));
  const lines = ['Today in Linked Lead AI', 'Here is what needs attention today.'];
  lines.push(tasks.length
    ? `\nTasks to complete:\n${tasks.map((t) => `- ${shortId(t.id)}: ${t.title}${t.description ? `\n  Why: ${t.description}` : ''}\n  Mark done: /done ${shortId(t.id)}`).join('\n')}`
    : '\nTasks to complete: none due');
  lines.push(followUps.length
    ? `\nFollow-ups due:\n${followUps.map((l) => `- ${leadLabel(l)}\n  Company/role: ${[l.company, l.role].filter(Boolean).join(' - ') || 'Not specified'}\n  Score: ${scoreLabel(l.score)}\n  Next: ${l.recommendedNextAction || 'Send a short follow-up message.'}`).join('\n')}`
    : '\nFollow-ups due: none due');
  return lines.join('\n');
}

function topLeads(user) {
  const leads = [...user.leads].filter(activeLead).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
  if (leads.length === 0) return 'No active leads yet.';
  return `Top active opportunities:\n${leads.map((l) => [
    `- ${leadLabel(l)}`,
    `  Score: ${scoreLabel(l.score)}`,
    `  Company/role: ${[l.company, l.role].filter(Boolean).join(' - ') || 'Not specified'}`,
    l.trustLevel ? `  Trust: ${statusLabel(l.trustLevel)}` : '',
    `  Next: ${l.recommendedNextAction || 'Review this lead and decide the best outreach step.'}`,
  ].filter(Boolean).join('\n')).join('\n')}`;
}

function followUps(user) {
  const leads = [...user.leads]
    .filter((l) => l.followUpDate && activeLead(l))
    .sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate)))
    .slice(0, 12);
  if (leads.length === 0) return 'No pending follow-ups.';
  return `Pending follow-ups:\n${leads.map((l) => [
    `- ${formatDateTime(l.followUpDate, l.followUpTime)}: ${leadLabel(l)}`,
    `  Company/role: ${[l.company, l.role].filter(Boolean).join(' - ') || 'Not specified'}`,
    `  Score: ${scoreLabel(l.score)}`,
    `  Next: ${l.recommendedNextAction || 'Send a concise follow-up and update the lead status.'}`,
  ].join('\n')).join('\n')}`;
}

async function generatePostDraft(platform, topic, user) {
  const provider = (process.env.AI_PROVIDER || process.env.VITE_AI_PROVIDER || 'anthropic').toLowerCase();
  const prompt = `Generate a ${platform} content draft for this topic: ${topic}

User profile: ${user.profile?.fullName || ''} ${user.profile?.headline || ''}
Skills: ${(user.profile?.skills || []).join(', ')}
Portfolio summary: ${user.profile?.portfolioSummary || ''}

Make it useful, specific, and ready to post.`;

  if (provider === 'groq') return generateGroq(prompt);
  if (provider === 'gemini') return generateGemini(prompt);
  return generateAnthropic(prompt);
}

async function generateAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Server AI is not configured. Set ANTHROPIC_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY.');
  const model = process.env.ANTHROPIC_MODEL || process.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Anthropic generation failed.');
  return data.content?.map((part) => part.text || '').join('\n').trim();
}

async function generateGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('Server AI is not configured. Set GROQ_API_KEY.');
  const model = process.env.GROQ_MODEL || process.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.7, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Groq generation failed.');
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function generateGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Server AI is not configured. Set GEMINI_API_KEY.');
  const model = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gemini generation failed.');
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n').trim() || '';
}

async function handleCommand(update) {
  const message = update.message;
  if (!message?.text) return;
  const chatId = message.chat.id;
  const text = message.text.trim();
  const [commandRaw, ...rest] = text.split(/\s+/);
  const command = commandRaw.split('@')[0].toLowerCase();

  if (command === '/start' || command === '/link' || command === '/connect') {
    const token = rest[0] || '';
    if (!token) {
      const existing = findUserByChat(chatId);
      if (existing) {
        await telegram('sendMessage', { chat_id: chatId, text: 'Telegram is already connected to Linked Lead AI. Open the app and refresh status if the button has not changed yet.' });
        return;
      }
      await telegram('sendMessage', { chat_id: chatId, text: 'Open Linked Lead AI Settings and send the /link code shown there.' });
      return;
    }
    const userId = token.startsWith('user_') ? token.slice(5) : token;
    const user = command === '/start' ? getUser(userId) : findUserByLinkCode(token);
    if (!user) {
      await telegram('sendMessage', { chat_id: chatId, text: 'Link code not found. Open Linked Lead AI Settings, click Sync Now, then send the /link code again.' });
      return;
    }
    user.telegram = {
      chatId,
      username: message.from?.username || '',
      firstName: message.from?.first_name || '',
      connectedAt: new Date().toISOString(),
    };
    await saveStore();
    await telegram('sendMessage', {
      chat_id: chatId,
      text: [
        'Telegram is now connected to Linked Lead AI.',
        '',
        'What this bot will do:',
        '- Remind you about leads that need follow-up.',
        '- Show the company, role, score, and recommended next step.',
        '- Send scheduled content reminders when it is time to post.',
        '- Let you mark tasks as complete from Telegram.',
        '',
        'Useful commands:',
        '- /today: show tasks and follow-ups due today.',
        '- /leads: show your strongest active opportunities.',
        '- /followups: show upcoming follow-ups with dates and next actions.',
        '- /post linkedin topic: draft a quick post from Telegram.',
        '- /done task_id: mark a task complete after you finish it.',
      ].join('\n'),
    });
    return;
  }

  const user = findUserByChat(chatId);
  if (!user) {
    await telegram('sendMessage', { chat_id: chatId, text: 'This chat is not connected. Open Linked Lead AI Settings and connect Telegram first.' });
    return;
  }

  if (command === '/today') {
    await sendTelegram(user, todaySummary(user));
  } else if (command === '/leads') {
    await sendTelegram(user, topLeads(user));
  } else if (command === '/followups') {
    await sendTelegram(user, followUps(user));
  } else if (command === '/done') {
    const idPrefix = rest[0] || '';
    const task = user.tasks.find((t) => t.status === 'pending' && (t.id === idPrefix || shortId(t.id) === idPrefix));
    if (!task) {
      await sendTelegram(user, 'Task not found. Use /today to see pending task IDs.');
      return;
    }
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    if (!user.commandDoneTaskIds.includes(task.id)) user.commandDoneTaskIds.push(task.id);
    await saveStore();
    await sendTelegram(user, `Marked done: ${task.title}`);
  } else if (command === '/post') {
    const platform = rest.shift() || 'linkedin';
    const topic = rest.join(' ');
    if (!topic) {
      await sendTelegram(user, [
        'To draft content, send:',
        '/post linkedin your topic',
        '',
        'Examples:',
        '- /post linkedin lessons from building an AI lead tracker',
        '- /post x why follow-up timing matters',
        '- /post medium how I built my CV match workflow',
      ].join('\n'));
      return;
    }
    await sendTelegram(user, `Generating ${platform} draft...`);
    try {
      const draft = await generatePostDraft(platform, topic, user);
      await sendTelegram(user, draft || 'No draft was generated.');
    } catch (err) {
      await sendTelegram(user, err.message);
    }
  } else {
    await sendTelegram(user, [
      'Available commands:',
      '- /today: tasks and follow-ups due today.',
      '- /leads: strongest active opportunities.',
      '- /followups: pending follow-ups with company, role, score, and next step.',
      '- /post linkedin topic: generate a quick content draft.',
      '- /done task_id: mark a task complete.',
      '- /link CODE: connect this Telegram chat to your app account.',
    ].join('\n'));
  }
}

async function pollTelegram() {
  if (!TOKEN) return;
  try {
    const updates = await telegram('getUpdates', {
      offset: state.pollOffset ? state.pollOffset + 1 : undefined,
      timeout: 10,
      allowed_updates: ['message'],
    });
    for (const update of updates) {
      state.pollOffset = update.update_id;
      await handleCommand(update);
    }
  } catch (err) {
    console.error('Telegram polling failed:', err.message);
  } finally {
    setTimeout(pollTelegram, 1500);
  }
}

async function route(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, {});
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, apiVersion: API_VERSION, botConfigured: Boolean(TOKEN), bot: state.bot, databaseConfigured: Boolean(sql) });
    }

    if (req.method === 'GET' && url.pathname === '/api/app/state') {
      const userId = url.searchParams.get('userId');
      if (!userId) return json(res, 400, { ok: false, error: 'userId is required' });
      const remoteUser = await loadUserSnapshot(userId);
      const user = remoteUser || state.store.users[userId] || null;
      return json(res, 200, {
        ok: true,
        databaseConfigured: Boolean(sql),
        user: user || null,
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/app/state') {
      const body = await readJson(req);
      if (!body.userId) return json(res, 400, { ok: false, error: 'userId is required' });
      const user = getUser(body.userId);
      Object.assign(user, {
        profile: body.profile || user.profile || {},
        email: body.email || user.email,
        name: body.name || user.name,
        projects: Array.isArray(body.projects) ? body.projects : user.projects || [],
        interactions: Array.isArray(body.interactions) ? body.interactions : user.interactions || [],
        settings: mergeSettings(body.settings || user.settings),
        tasks: Array.isArray(body.tasks) ? body.tasks : [],
        leads: Array.isArray(body.leads) ? body.leads : [],
        messages: Array.isArray(body.messages) ? body.messages : [],
        contentReminders: Array.isArray(body.contentReminders) ? body.contentReminders : [],
      });
      const updatedAt = await saveUserSnapshot(user);
      await saveStore();
      return json(res, 200, { ok: true, databaseConfigured: Boolean(sql), updatedAt });
    }

    if (req.method === 'GET' && url.pathname === '/api/telegram/status') {
      const userId = url.searchParams.get('userId');
      const user = userId ? getUser(userId) : null;
      return json(res, 200, {
        ok: true,
        botConfigured: Boolean(TOKEN),
        bot: state.bot,
        connected: Boolean(user?.telegram?.chatId),
        telegram: user?.telegram || {},
        settings: user?.settings || defaultSettings(),
        doneTaskIds: user?.commandDoneTaskIds || [],
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/telegram/sync') {
      const body = await readJson(req);
      if (!body.userId) return json(res, 400, { ok: false, error: 'userId is required' });
      const user = getUser(body.userId);
      user.profile = body.profile || user.profile || {};
      user.email = body.email || user.email;
      user.name = body.name || user.name;
      user.settings = mergeSettings(body.settings);
      user.projects = Array.isArray(body.projects) ? body.projects : user.projects || [];
      user.interactions = Array.isArray(body.interactions) ? body.interactions : user.interactions || [];
      user.tasks = Array.isArray(body.tasks) ? body.tasks : [];
      user.leads = Array.isArray(body.leads) ? body.leads : [];
      user.messages = Array.isArray(body.messages) ? body.messages : [];
      user.contentReminders = Array.isArray(body.contentReminders) ? body.contentReminders : [];
      await processDueForUser(user);
      const updatedAt = await saveUserSnapshot(user);
      await saveStore();
      return json(res, 200, { ok: true, connected: Boolean(user.telegram.chatId), doneTaskIds: user.commandDoneTaskIds || [], databaseConfigured: Boolean(sql), updatedAt });
    }

    if (req.method === 'POST' && url.pathname === '/api/telegram/test') {
      const body = await readJson(req);
      const user = getUser(body.userId);
      if (!user.telegram.chatId) return json(res, 400, { ok: false, error: 'Telegram is not connected for this user.' });
      await sendTelegram(user, 'Linked Lead AI Telegram reminders are connected.');
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/telegram/webhook') {
      const update = await readJson(req);
      await handleCommand(update);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/telegram/reminders') {
      await processAllDue();
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    console.error(err);
    return json(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}

await loadStore();
await ensureDatabase();
await getBotInfo();

http.createServer(route).listen(PORT, '127.0.0.1', () => {
  console.log(`Telegram backend listening on http://localhost:${PORT}`);
  console.log(TOKEN ? 'Telegram bot configured.' : 'TELEGRAM_BOT_TOKEN is not configured.');
  console.log(sql ? 'Neon database configured for app snapshots.' : 'DATABASE_URL is not configured; using JSON/local fallback.');
});

setInterval(processAllDue, 60_000);
pollTelegram();
