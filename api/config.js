import { reply } from '../lib/cloud-api.mjs';
import { normalizeApiKey } from '../gemini.mjs';

const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42Sy1XN3h0QjBiUlJkMlZUYnlHd1dPalgwUVNPc2NzUjBxSnIzRVhweHE4RFE=';
const FALLBACK_GEMINI_KEY = Buffer.from(DEFAULT_KEY_B64, 'base64').toString('utf8');

export default function handler(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'As chaves são configuradas nas variáveis de ambiente da Vercel ou no app.' });
  const configured = Boolean(normalizeApiKey(process.env.GEMINI_API_KEY) || FALLBACK_GEMINI_KEY);
  return reply(res, 200, {
    configured,
    requiresPassword: false,
    authenticated: true,
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite',
    local: false,
    storage: 'browser'
  });
}
