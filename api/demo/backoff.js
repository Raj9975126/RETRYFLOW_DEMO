import { calculateDelay } from '../../lib/retryflow.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { delay = 500, backoff = 'exponential', factor = 2, retries = 5, jitter = false } = req.body || {};

  const delays = [];
  for (let i = 1; i <= Number(retries); i++) {
    delays.push({
      attempt: i,
      delay: calculateDelay({
        attempt: i,
        delay: Number(delay),
        backoff,
        factor: Number(factor),
        jitter: Boolean(jitter),
      }),
    });
  }

  res.json({ success: true, delays, config: { delay, backoff, factor, retries, jitter } });
}
