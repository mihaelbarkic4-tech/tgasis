import type { VercelRequest, VercelResponse } from '@vercel/node';
import { env } from '../lib/env';
import { handleUpdate, type TgUpdate } from '../lib/handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(200).json({ ok: false, error: 'forbidden' });
  }

  try {
    await handleUpdate(req.body as TgUpdate);
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  return res.status(200).json({ ok: true });
}
