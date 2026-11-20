import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { retry, calculateDelay } from './lib/retryflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Demo 1: Basic Retry (Simulated flaky function) ───
app.post('/api/demo/basic-retry', async (req, res) => {
  const { retries = 3, delay = 500, backoff = 'exponential' } = req.body;
  const logs = [];
  let attemptCount = 0;
  const failUntil = Math.min(retries, 3); // succeed on attempt failUntil+1

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
});

// ─── Demo 2: HTTP Fetch with Retry ───
app.post('/api/demo/http-retry', async (req, res) => {
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
          message: `Fetching from JSONPlaceholder API...`,
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
});

// ─── Demo 3: Timeout Demo ───
app.post('/api/demo/timeout', async (req, res) => {
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
        timeout: 1000, // 1s per-attempt timeout
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
});

// ─── Demo 4: Backoff Calculator ───
app.post('/api/demo/backoff', async (req, res) => {
  const { delay = 500, backoff = 'exponential', factor = 2, retries = 5, jitter = false } = req.body;

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
});

// ─── Demo 5: All Fail Demo ───
app.post('/api/demo/all-fail', async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`🚀 RetryFlow Demo running at http://localhost:${PORT}`);
});
