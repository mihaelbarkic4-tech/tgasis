import type { Task } from './db';

export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return '📋 Задач на сегодня нет.';

  const lines = tasks.map((t) => {
    const check = t.done ? '✅' : '⬜';
    const time = t.time ? ` <b>${t.time}</b>` : '';
    const strike = t.done ? `<s>${t.text}</s>` : t.text;
    return `${check}${time} ${strike} /done_${t.id}`;
  });

  return `📋 <b>Задачи на сегодня:</b>\n\n${lines.join('\n')}`;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
