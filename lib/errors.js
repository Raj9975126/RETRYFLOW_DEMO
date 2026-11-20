export class RetryError extends Error {
  constructor(message, { attempts, lastError, allErrors = [] } = {}) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
    this.allErrors = allErrors;
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Operation timed out', timeoutMs) {
    super(message);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class AbortError extends Error {
  constructor(message = 'Operation was aborted') {
    super(message);
    this.name = 'AbortError';
  }
}
