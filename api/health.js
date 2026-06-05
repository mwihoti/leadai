import { API_VERSION, botConfigured, databaseConfigured, getBotInfo, sendJson } from './_lib/backend.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  try {
    const bot = botConfigured() ? await getBotInfo().catch(() => null) : null;
    return sendJson(res, 200, {
      ok: true,
      apiVersion: API_VERSION,
      botConfigured: botConfigured(),
      bot,
      databaseConfigured: databaseConfigured(),
    });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
}
