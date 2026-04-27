import { env } from './env';

export interface ExtractedTask {
  text: string;
  time: string | null;
}

export async function extractTasks(userText: string): Promise<ExtractedTask[]> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Ты помощник по планированию дня. Из сообщения пользователя извлеки список задач.
Для каждой задачи определи:
- text: краткое описание (глагол + объект, до 80 символов)
- time: время в формате HH:MM если упомянуто, иначе null

Верни ТОЛЬКО валидный JSON-массив без пояснений и markdown:
[{"text":"...","time":"HH:MM или null"}]
Если задач нет — верни [].`,
        },
        { role: 'user', content: userText },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`OpenRouter ${res.status}: ${body}`);
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices: [{ message: { content: string } }] };
  const raw = data.choices[0].message.content.trim();

  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]) as ExtractedTask[];
  } catch {
    return [];
  }
}
