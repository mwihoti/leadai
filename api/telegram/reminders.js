import { processAllDue, sendJson } from '../_lib/backend.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (!['GET', 'POST'].includes(req.method)) return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const processed = await processAllDue();
    return sendJson(res, 200, { ok: true, processed });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}
