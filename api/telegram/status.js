import { botConfigured, databaseConfigured, defaultSettings, getBotInfo, getUser, sendJson } from '../_lib/backend.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const userId = req.query?.userId;
    const user = userId ? await getUser(userId) : null;
    const bot = botConfigured() ? await getBotInfo().catch(() => null) : null;
    return sendJson(res, 200, {
      ok: true,
      botConfigured: botConfigured(),
      databaseConfigured: databaseConfigured(),
      bot,
      connected: Boolean(user?.telegram?.chatId),
      telegram: user?.telegram || {},
      settings: user?.settings || defaultSettings(),
      doneTaskIds: user?.commandDoneTaskIds || [],
    });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}
