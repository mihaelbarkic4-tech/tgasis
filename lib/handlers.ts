import { sendMessage, getFileUrl, downloadFile } from './telegram';
import { transcribeAudio } from './transcribe';
import { extractTasks } from './llm';
import { saveTasks, getTodayTasks, markDone, clearTodayTasks } from './db';
import { formatTaskList, today } from './format';

interface TgUser {
  id: number;
  first_name?: string;
}

interface TgVoice {
  file_id: string;
  mime_type?: string;
  duration: number;
}

interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number };
  text?: string;
  voice?: TgVoice;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  if (!msg?.from) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const day = today();

  console.log(`[handler] user=${userId} chat=${chatId} text=${msg.text ?? '(voice)'}`);

  if (msg.text) {
    const text = msg.text.trim();

    if (text === '/whoami') {
      await sendMessage(chatId, `Твой user_id: <code>${userId}</code>`);
      return;
    }

    if (text === '/start') {
      await sendMessage(
        chatId,
        `👋 Привет! Я бот утреннего планирования.\n\nОтправь голосовое сообщение или текст с планами — я разберу их на задачи.\n\nКоманды:\n/today — задачи на сегодня\n/done_<b>ID</b> — отметить выполненной\n/clear — удалить все задачи на сегодня`,
      );
      return;
    }

    if (text === '/today') {
      const tasks = await getTodayTasks(userId, day);
      await sendMessage(chatId, formatTaskList(tasks));
      return;
    }

    if (text === '/clear') {
      const count = await clearTodayTasks(userId, day);
      await sendMessage(chatId, `🗑 Удалено задач: ${count}.`);
      return;
    }

    const doneMatch = text.match(/^\/done_(\d+)$/);
    if (doneMatch) {
      const taskId = parseInt(doneMatch[1], 10);
      const ok = await markDone(taskId, userId);
      if (ok) {
        const tasks = await getTodayTasks(userId, day);
        await sendMessage(chatId, `✅ Готово!\n\n${formatTaskList(tasks)}`);
      } else {
        await sendMessage(chatId, '❌ Задача не найдена.');
      }
      return;
    }

    await processText(chatId, userId, day, text);
    return;
  }

  if (msg.voice) {
    await sendMessage(chatId, '🎤 Транскрибирую голосовое...');
    try {
      const fileUrl = await getFileUrl(msg.voice.file_id);
      const buffer = await downloadFile(fileUrl);
      const mimeType = msg.voice.mime_type ?? 'audio/ogg';
      const transcript = await transcribeAudio(buffer, mimeType);
      await sendMessage(chatId, `📝 Распознано: <i>${transcript}</i>`);
      await processText(chatId, userId, day, transcript);
    } catch (err) {
      console.error('Transcription error:', err);
      await sendMessage(chatId, '⚠️ Не удалось распознать голосовое. Попробуй ещё раз.');
    }
  }
}

async function processText(chatId: number, userId: number, day: string, text: string): Promise<void> {
  await sendMessage(chatId, '⏳ Разбираю задачи...');
  try {
    const extracted = await extractTasks(text);
    if (extracted.length === 0) {
      await sendMessage(chatId, '🤔 Задач не найдено. Опиши планы подробнее.');
      return;
    }
    await saveTasks(userId, extracted, day);
    const tasks = await getTodayTasks(userId, day);
    await sendMessage(chatId, `✨ Добавлено задач: ${extracted.length}\n\n${formatTaskList(tasks)}`);
  } catch (err) {
    let msg: string;
    if (err instanceof Error) msg = err.message;
    else if (err && typeof err === 'object') msg = JSON.stringify(err);
    else msg = String(err);
    console.error('Process error:', msg, err);
    await sendMessage(chatId, `⚠️ Ошибка: ${msg.slice(0, 500)}`);
  }
}
