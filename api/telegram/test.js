import { getUser, readJson, sendJson, sendTelegram } from '../_lib/backend.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = await readJson(req);
    if (!body.userId) return sendJson(res, 400, { ok: false, error: 'userId is required' });
    const user = await getUser(body.userId);
    if (!user.telegram?.chatId) return sendJson(res, 400, { ok: false, error: 'Telegram is not connected for this user.' });
    await sendTelegram(user, 'Linked Lead AI Telegram reminders are connected.');
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}
