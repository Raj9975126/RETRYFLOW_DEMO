import { retry } from '../../lib/retryflow.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const logs = [];
  let attemptCount = 0;

  try {
    const result = await retry(
      async () => {
        attemptCount++;
        const timestamp = new Date().toISOString();

        logs.push({
          attempt: attemptCount,
          status: 'trying',
          message: 'Starting slow operation (3s work)...',
          timestamp,
        });

        // Simulate a slow operation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        logs[logs.length - 1].status = 'success';
        return 'Completed';
      },
      {
        retries: 2,
        delay: 300,
        timeout: 1000,
        retryOnTimeout: true,
        onRetry: ({ attempt, delay: nextDelay, error }) => {
          logs[logs.length - 1].status = 'timeout';
          logs[logs.length - 1].message = `Timed out! (${error.message})`;
          logs[logs.length - 1].nextDelay = nextDelay;
        },
      }
    );

    res.json({ success: true, result, logs, totalAttempts: attemptCount });
  } catch (error) {
    if (logs.length > 0 && logs[logs.length - 1].status === 'trying') {
      logs[logs.length - 1].status = 'timeout';
      logs[logs.length - 1].message = error.message;
    }
    res.json({ success: false, error: error.message, logs, totalAttempts: attemptCount });
  }
}
