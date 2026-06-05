import {
  databaseConfigured,
  getUser,
  mergeSnapshot,
  processDueForUser,
  readJson,
  saveUserSnapshot,
  sendJson,
} from '../_lib/backend.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = await readJson(req);
    if (!body.userId) return sendJson(res, 400, { ok: false, error: 'userId is required' });
    const existing = await getUser(body.userId);
    const user = mergeSnapshot(existing, body);
    await processDueForUser(user);
    const updatedAt = await saveUserSnapshot(user);
    return sendJson(res, 200, {
      ok: true,
      connected: Boolean(user.telegram?.chatId),
      doneTaskIds: user.commandDoneTaskIds || [],
      databaseConfigured: databaseConfigured(),
      updatedAt,
    });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}
