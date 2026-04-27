import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';

const OWNER_USER_ID = parseInt(process.env.OWNER_USER_ID ?? '0', 10);

function client() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!OWNER_USER_ID) {
    return res.status(500).json({ error: 'OWNER_USER_ID env var not set' });
  }

  const supabase = client();

  try {
    if (req.method === 'GET') {
      const { from, to } = req.query;
      let q = supabase.from('tasks').select().eq('user_id', OWNER_USER_ID);
      if (typeof from === 'string') q = q.gte('day', from);
      if (typeof to === 'string') q = q.lte('day', to);
      const { data, error } = await q
        .order('day', { ascending: true })
        .order('time', { ascending: true, nullsFirst: false })
        .order('created', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { text, time, day } = req.body as { text?: string; time?: string | null; day?: string };
      if (!text || !day) return res.status(400).json({ error: 'text and day required' });
      const { data, error } = await supabase
        .from('tasks')
        .insert({ user_id: OWNER_USER_ID, text, time: time ?? null, day, done: false })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PATCH') {
      const id = parseInt(String(req.query.id ?? ''), 10);
      if (!id) return res.status(400).json({ error: 'id required' });
      const body = req.body as Partial<{ text: string; time: string | null; day: string; done: boolean }>;
      const updates: Record<string, unknown> = {};
      if (body.text !== undefined) updates.text = body.text;
      if (body.time !== undefined) updates.time = body.time;
      if (body.day !== undefined) updates.day = body.day;
      if (body.done !== undefined) updates.done = body.done;
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', OWNER_USER_ID)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const id = parseInt(String(req.query.id ?? ''), 10);
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', OWNER_USER_ID);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'internal error';
    console.error('tasks api error:', err);
    return res.status(500).json({ error: msg });
  }
}
