import { findUserByEmail, readJson, sendJson } from '../_lib/backend.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = await readJson(req);
    const email = body?.email;
    if (!email) return sendJson(res, 400, { ok: false, error: 'email is required' });
    const user = await findUserByEmail(email);
    if (!user) return sendJson(res, 200, { ok: true, found: false });
    return sendJson(res, 200, { ok: true, found: true, userId: user.userId });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}
