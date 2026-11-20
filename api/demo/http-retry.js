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
          message: 'Fetching from JSONPlaceholder API...',
          timestamp,
        });

        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        logs[logs.length - 1].status = 'success';
        logs[logs.length - 1].message = 'API call succeeded!';
        return data;
      },
      { retries: 3, delay: 500, backoff: 'exponential' }
    );

    res.json({ success: true, result, logs, totalAttempts: attemptCount });
  } catch (error) {
    res.json({ success: false, error: error.message, logs, totalAttempts: attemptCount });
  }
}
