import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export interface Task {
  id: number;
  user_id: number;
  text: string;
  time: string | null;
  day: string;
  done: boolean;
  created: string;
}

function client() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function saveTasks(
  userId: number,
  tasks: { text: string; time: string | null }[],
  day: string,
): Promise<Task[]> {
  const rows = tasks.map((t) => ({ user_id: userId, text: t.text, time: t.time, day, done: false }));
  const { data, error } = await client().from('tasks').insert(rows).select();
  if (error) throw error;
  return data as Task[];
}

export async function getTodayTasks(userId: number, day: string): Promise<Task[]> {
  const { data, error } = await client()
    .from('tasks')
    .select()
    .eq('user_id', userId)
    .eq('day', day)
    .order('time', { ascending: true, nullsFirst: false })
    .order('created', { ascending: true });
  if (error) throw error;
  return data as Task[];
}

export async function markDone(taskId: number, userId: number): Promise<boolean> {
  const { data, error } = await client()
    .from('tasks')
    .update({ done: true })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function clearTodayTasks(userId: number, day: string): Promise<number> {
  const { data, error } = await client()
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .eq('day', day)
    .select();
  if (error) throw error;
  return data?.length ?? 0;
}
