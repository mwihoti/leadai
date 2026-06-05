import {
  databaseConfigured,
  getUser,
  loadUserSnapshot,
  mergeSnapshot,
  readJson,
  saveUserSnapshot,
  sendJson,
} from '../_lib/backend.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  try {
    if (req.method === 'GET') {
      const userId = req.query?.userId;
      if (!userId) return sendJson(res, 400, { ok: false, error: 'userId is required' });
      return sendJson(res, 200, {
        ok: true,
        databaseConfigured: databaseConfigured(),
        user: await loadUserSnapshot(userId),
      });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      if (!body.userId) return sendJson(res, 400, { ok: false, error: 'userId is required' });
      const existing = await getUser(body.userId);
      const user = mergeSnapshot(existing, body);
      const updatedAt = await saveUserSnapshot(user);
      return sendJson(res, 200, { ok: true, databaseConfigured: databaseConfigured(), updatedAt });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}
