import { RetryError, TimeoutError, AbortError } from './errors.js';
import { calculateDelay } from './backoff.js';
import { withTimeout, createDeadlineController } from './timeout.js';

export const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      if (signal.reason instanceof TimeoutError || signal.reason instanceof AbortError) return reject(signal.reason);
      return reject(new AbortError(signal.reason?.message || 'Operation was aborted'));
    }
    if (ms <= 0) return resolve();
    let timer = null;
    let onAbort = null;
    const cleanup = () => { if (timer) clearTimeout(timer); if (signal && onAbort) signal.removeEventListener('abort', onAbort); };
    onAbort = () => { cleanup(); if (signal.reason instanceof TimeoutError || signal.reason instanceof AbortError) reject(signal.reason); else reject(new AbortError(signal.reason?.message || 'Operation was aborted')); };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => { cleanup(); resolve(); }, ms);
  });
}

export function defaultShouldRetry(error, response, retryStatusCodes = DEFAULT_RETRY_STATUS_CODES, retryOnTimeout = true) {
  if (error instanceof AbortError || error?.name === 'AbortError') return false;
  if (error instanceof TimeoutError && !retryOnTimeout) return false;
  if (error) {
    const status = error.status || error.statusCode || error.response?.status;
    if (typeof status === 'number') return retryStatusCodes.includes(status);
    return true;
  }
  if (response && typeof response.status === 'number') return retryStatusCodes.includes(response.status);
  return false;
}

export async function retry(fn, options = {}) {
  if (typeof fn !== 'function') throw new TypeError(`retry() expects first argument to be a function, received ${typeof fn}`);

  const {
    retries = 3, delay = 1000, backoff = 'exponential', factor = 2, maxDelay = 30000, jitter = false,
    timeout = 0, attemptTimeout, overallTimeout = 0, totalTimeout, retryOnTimeout = true,
    signal, retryStatusCodes = DEFAULT_RETRY_STATUS_CODES, shouldRetry, onRetry, throwOnFailedResponse = false,
  } = options;

  const perAttemptTimeout = attemptTimeout ?? timeout ?? 0;
  const deadlineTimeout = totalTimeout ?? overallTimeout ?? 0;
  const deadline = createDeadlineController(deadlineTimeout, signal);
  const maxAttempts = Math.max(0, retries) + 1;
  const allErrors = [];

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (deadline.signal.aborted) {
        if (deadline.isTimedOut() || deadline.signal.reason instanceof TimeoutError)
          throw deadline.signal.reason || new TimeoutError(`Total retry operation timed out after ${deadlineTimeout}ms`, deadlineTimeout);
        throw new AbortError(deadline.signal.reason?.message || 'Operation was aborted');
      }

      let currentTimeout = perAttemptTimeout;
      if (deadlineTimeout > 0) {
        const remaining = deadline.getRemainingMs();
        if (remaining <= 0) throw new TimeoutError(`Total retry operation timed out after ${deadlineTimeout}ms`, deadlineTimeout);
        currentTimeout = currentTimeout > 0 ? Math.min(currentTimeout, remaining) : remaining;
      }

      let result = undefined, error = null, failed = false;
      try {
        result = await withTimeout(fn, { timeout: currentTimeout, signal: deadline.signal, attempt });
      } catch (err) {
        error = err; failed = true; allErrors.push(err);
      }

      if (deadline.isTimedOut() || (error instanceof TimeoutError && deadlineTimeout > 0 && deadline.getRemainingMs() <= 0))
        throw new TimeoutError(`Total retry operation timed out after ${deadlineTimeout}ms`, deadlineTimeout);
      if (error instanceof AbortError || signal?.aborted) throw error || new AbortError('Operation was aborted');

      let willRetry = false;
      const context = { attempt, retriesLeft: maxAttempts - attempt };
      if (typeof shouldRetry === 'function') willRetry = Boolean(shouldRetry(error, result, context));
      else willRetry = defaultShouldRetry(error, result, retryStatusCodes, retryOnTimeout);

      if (!failed && !willRetry) return result;

      if (deadlineTimeout > 0 && deadline.getRemainingMs() <= 0)
        throw new TimeoutError(`Total retry operation timed out after ${deadlineTimeout}ms`, deadlineTimeout);

      if (willRetry && attempt < maxAttempts) {
        const nextDelay = calculateDelay({ attempt, delay, backoff, factor, maxDelay, jitter });
        if (typeof onRetry === 'function') {
          try { onRetry({ attempt, nextAttempt: attempt + 1, error, response: result, delay: nextDelay }); } catch (cbErr) { console.error('[RetryFlow] Error in onRetry callback:', cbErr); }
        }
        await sleep(nextDelay, deadline.signal);
        continue;
      }

      if (failed) {
        if (allErrors.length > 1) throw new RetryError(`All ${attempt} attempts failed. Last error: ${error?.message || error}`, { attempts: attempt, lastError: error, allErrors });
        throw error;
      }
      if (throwOnFailedResponse && willRetry) throw new RetryError(`Operation completed with unhandled status ${result?.status} after ${attempt} attempts`, { attempts: attempt, lastError: result, allErrors });
      return result;
    }
  } finally {
    deadline.cleanup();
  }
}

export { calculateDelay } from './backoff.js';
export { withTimeout, createDeadlineController } from './timeout.js';
export { RetryError, TimeoutError, AbortError } from './errors.js';
export default retry;
