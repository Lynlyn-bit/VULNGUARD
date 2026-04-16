/**
 * Utility functions for API request optimization
 * Prevents duplicate requests and improves performance
 */

/**
 * Debounce function - delays execution until a delay passes without new calls
 * Useful for search, auto-save, and form validation
 */
export function debounce<T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>,
  delay: number
): (...args: T) => Promise<R> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        try {
          const result = fn(...args);
          if (result instanceof Promise) {
            resolve(result);
          } else {
            resolve(result as R);
          }
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Throttle function - executes at most once per delay interval
 * Useful for scroll handlers, window resize, button clicks
 */
export function throttle<T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>,
  delay: number
): (...args: T) => R | Promise<R> | undefined {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;

  return (...args: T): R | Promise<R> | undefined => {
    lastArgs = args;
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        if (lastArgs) {
          return fn(...lastArgs);
        }
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Request cache to prevent duplicate simultaneous requests
 * Returns cached promise while first request is pending
 */
export class RequestCache<K, V> {
  private cache = new Map<K, Promise<V>>();
  private ttl: number;

  constructor(ttlMs: number = 30000) {
    this.ttl = ttlMs;
  }

  async get(
    key: K,
    fetcher: () => Promise<V>
  ): Promise<V> {
    // Return existing promise if one is pending
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Create new promise
    const promise = fetcher();
    this.cache.set(key, promise);

    try {
      const result = await promise;
      // Keep in cache for TTL
      setTimeout(() => this.cache.delete(key), this.ttl);
      return result;
    } catch (error) {
      // Remove from cache on error so retries will work
      this.cache.delete(key);
      throw error;
    }
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Hook-friendly debounce for use in React components
 */
export function useDebounce<T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>,
  delay: number
) {
  const debouncedFn = debounce(fn, delay);
  return debouncedFn;
}

/**
 * Prevent multiple rapid clicks
 */
export function createClickThrottler(delay: number = 1000) {
  let lastClick = 0;

  return {
    isAllowed: () => {
      const now = Date.now();
      if (now - lastClick >= delay) {
        lastClick = now;
        return true;
      }
      return false;
    },
    reset: () => {
      lastClick = 0;
    },
  };
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
