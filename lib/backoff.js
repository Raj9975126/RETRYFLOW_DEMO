export function calculateDelay({
  attempt = 1,
  delay = 1000,
  backoff = 'exponential',
  factor = 2,
  maxDelay = 30000,
  jitter = false,
} = {}) {
  const safeAttempt = Math.max(1, attempt);
  const baseDelay = Math.max(0, delay);
  const safeMax = Math.max(0, maxDelay);
  const isExponential = backoff !== 'fixed' && backoff !== false;

  let computedDelay = baseDelay;
  if (isExponential) {
    computedDelay = baseDelay * Math.pow(factor, safeAttempt - 1);
  }
  computedDelay = Math.min(computedDelay, safeMax);

  if (jitter) {
    computedDelay = Math.floor(Math.random() * (computedDelay + 1));
  }

  return Math.round(computedDelay);
}
