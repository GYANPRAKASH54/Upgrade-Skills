const states = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

const breakers = new Map();

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3; // consecutive failures before opening
    this.recoveryTimeout = options.recoveryTimeout || 30000; // time in ms to stay open
    
    this.state = states.CLOSED;
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async execute(fn, fallbackFn) {
    const now = Date.now();

    if (this.state === states.OPEN) {
      if (now - this.lastFailureTime > this.recoveryTimeout) {
        this.state = states.HALF_OPEN;
        console.log(`[CircuitBreaker:${this.name}] Transitioned to HALF_OPEN. Attempting execution...`);
      } else {
        console.warn(`[CircuitBreaker:${this.name}] Circuit is OPEN. Rejecting execution.`);
        if (fallbackFn) return fallbackFn(new Error('Circuit is open'));
        throw new Error(`Circuit breaker '${this.name}' is open`);
      }
    }

    try {
      const result = await fn();
      if (this.state === states.HALF_OPEN) {
        this.state = states.CLOSED;
        this.failures = 0;
        console.log(`[CircuitBreaker:${this.name}] Transitioned to CLOSED. Recovery successful.`);
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      console.error(`[CircuitBreaker:${this.name}] Failure detected (${this.failures}/${this.failureThreshold}):`, error.message);
      
      if (this.failures >= this.failureThreshold) {
        this.state = states.OPEN;
        console.error(`[CircuitBreaker:${this.name}] Failure threshold reached. Circuit is now OPEN.`);
      }

      if (fallbackFn) return fallbackFn(error);
      throw error;
    }
  }
}

/**
 * Returns a named circuit breaker instance.
 * @param {string} name Breaker name
 * @param {object} [options] Configuration overrides
 */
export function getBreaker(name, options) {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, options));
  }
  return breakers.get(name);
}
