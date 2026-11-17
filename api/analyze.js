import { analyze, normalizeApiKey } from '../gemini.mjs';
import { bodyObject, reply, sameOrigin } from '../lib/cloud-api.mjs';

const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42Sy1XN3h0QjBiUlJkMlZUYnlHd1dPalgwUVNPc2NzUjBxSnIzRVhweHE4RFE=';
const FALLBACK_GEMINI_KEY = Buffer.from(DEFAULT_KEY_B64, 'base64').toString('utf8');

export default async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Método não permitido.' });
  if (!sameOrigin(req)) return reply(res, 403, { error: 'Origem não permitida.' });

  try {
    const data = bodyObject(req);
    const userKey = normalizeApiKey(req.headers['x-gemini-key'] || req.headers['x-gemini-api-key']);
    const envKey = normalizeApiKey(process.env.GEMINI_API_KEY);
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';

    const primaryKey = userKey || envKey || FALLBACK_GEMINI_KEY;

    try {
      const result = await analyze(data, { apiKey: primaryKey, model });
      return reply(res, 200, result);
    } catch (analysisError) {
      const isInvalidKey = /recusada|não foi aceita|API_KEY_INVALID|invalid api key|não tem acesso/i.test(analysisError.message);
      if (primaryKey !== FALLBACK_GEMINI_KEY && isInvalidKey) {
        const fallbackResult = await analyze(data, { apiKey: FALLBACK_GEMINI_KEY, model });
        return reply(res, 200, fallbackResult);
      }
      throw analysisError;
    }
  } catch (e) {
    return reply(res, e.status || 400, { error: e.message });
  }
}
