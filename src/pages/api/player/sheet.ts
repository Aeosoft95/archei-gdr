import type { NextApiRequest, NextApiResponse } from 'next';
import { PCData, EMPTY_PC } from '@/types/character';

let memory: PCData = EMPTY_PC; // stub volatili per dev

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ data: memory });
  }
  if (req.method === 'POST') {
    try {
      const body = req.body as PCData;
      memory = body;
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(400).json({ error: 'Invalid payload' });
    }
  }
  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}