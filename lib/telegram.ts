import { env } from './env';

const BASE = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}`;
const FILE_BASE = `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}`;

export async function sendMessage(chatId: number, text: string): Promise<void> {
  const res = await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    console.error(`sendMessage ${res.status}: ${await res.text()}`);
  }
}

export async function getFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${BASE}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = (await res.json()) as { result: { file_path: string } };
  return `${FILE_BASE}/${data.result.file_path}`;
}

export async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
