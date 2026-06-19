import { Redis as UpstashRedis } from '@upstash/redis';

// In-memory fallback store
const memoryStore = new Map();

function memoryRateLimit(ip, limit, windowSeconds) {
  const now = Date.now();
  
  // Guard map size to prevent memory leaks in development/fallback environments
  if (memoryStore.size > 10000) {
    memoryStore.clear();
  }

  let record = memoryStore.get(ip);
  const windowMs = windowSeconds * 1000;

  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  record.count++;
  memoryStore.set(ip, record);

  const exceeded = record.count > limit;
  const retryAfter = Math.ceil(Math.max(0, record.resetTime - now) / 1000);

  return {
    exceeded,
    count: record.count,
    retryAfter,
  };
}

let redisClient = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redisClient = new UpstashRedis({ url, token });
  }
} catch (error) {
  console.error('Error initializing Upstash Redis client:', error);
}

/**
 * Distributed rate limiter with in-memory fallback
 * @param {string} ip Client IP address
 * @param {number} limit Maximum requests allowed in window
 * @param {number} windowSeconds Window duration in seconds
 * @returns {Promise<{exceeded: boolean, count: number, retryAfter: number}>}
 */
export async function rateLimit(ip, limit, windowSeconds) {
  if (!redisClient) {
    return memoryRateLimit(ip, limit, windowSeconds);
  }

  const key = `ratelimit:${ip}`;
  try {
    // Atomically increment request count
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, windowSeconds);
    }
    const ttl = await redisClient.ttl(key);
    const exceeded = count > limit;
    
    return {
      exceeded,
      count,
      retryAfter: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (error) {
    console.error('Redis rate limiting connection error, falling back to in-memory limiter:', error);
    return memoryRateLimit(ip, limit, windowSeconds);
  }
}
