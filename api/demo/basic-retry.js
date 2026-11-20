import { retry } from '../../lib/retryflow.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { retries = 3, delay = 500, backoff = 'exponential' } = req.body || {};
  const logs = [];
  let attemptCount = 0;
  const failUntil = Math.min(Number(retries), 3);

  try {
    const result = await retry(
      async () => {
        attemptCount++;
        const timestamp = new Date().toISOString();

        if (attemptCount <= failUntil) {
          logs.push({
            attempt: attemptCount,
            status: 'failed',
            error: 'Simulated server error',
            timestamp,
          });
          throw new Error('Simulated server error');
        }

        logs.push({
          attempt: attemptCount,
          status: 'success',
          message: 'Request succeeded!',
          timestamp,
        });
        return { data: 'Hello from RetryFlow! 🎉' };
      },
      {
        retries: Number(retries),
        delay: Number(delay),
        backoff,
        factor: 2,
        onRetry: ({ attempt, delay: nextDelay }) => {
          logs[logs.length - 1].nextDelay = nextDelay;
        },
      }
    );

    res.json({ success: true, result, logs, totalAttempts: attemptCount });
  } catch (error) {
    res.json({ success: false, error: error.message, logs, totalAttempts: attemptCount });
  }
}
