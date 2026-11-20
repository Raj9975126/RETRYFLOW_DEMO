import { retry } from '../../lib/retryflow.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const logs = [];
  let attemptCount = 0;

  try {
    await retry(
      async () => {
        attemptCount++;
        logs.push({
          attempt: attemptCount,
          status: 'failed',
          error: 'Service unavailable',
          timestamp: new Date().toISOString(),
        });
        throw new Error('Service unavailable');
      },
      {
        retries: 3,
        delay: 300,
        backoff: 'exponential',
        onRetry: ({ delay: nextDelay }) => {
          logs[logs.length - 1].nextDelay = nextDelay;
        },
      }
    );
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      errorType: error.name,
      logs,
      totalAttempts: attemptCount,
    });
  }
}
