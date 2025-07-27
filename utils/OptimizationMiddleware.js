/**
 * Middleware для оптимизации производительности
 */
const { apiCache, generalCache } = require('./CacheManager');

function apiCacheMiddleware(options = {}) {
  const {
    ttl = 2 * 60 * 1000,
    skipMethods = ['POST', 'PUT', 'DELETE', 'PATCH'],
    skipPaths = ['/api/debug', '/api/logs']
  } = options;

  return (req, res, next) => {
    if (skipMethods.includes(req.method)) {
      return next();
    }

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const cacheKey = apiCache.generateKey(req.method, req.path, req.query);
    const cachedResponse = apiCache.get(cacheKey);
    
    if (cachedResponse) {
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cachedResponse);
    }

    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(cacheKey, data, ttl);
      }
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      return originalJson.call(this, data);
    };

    next();
  };
}

function performanceMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      res.set('X-Response-Time', duration + 'ms');
      res.set('X-Timestamp', new Date().toISOString());
      
      if (duration > 1000) {
        console.warn(`Медленный запрос: ${req.method} ${req.path} - ${duration}ms`);
      }

      const statsKey = `perf:${req.method}:${req.path}`;
      const currentStats = generalCache.get(statsKey) || {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
      
      currentStats.count++;
      currentStats.totalTime += duration;
      currentStats.avgTime = currentStats.totalTime / currentStats.count;
      currentStats.minTime = Math.min(currentStats.minTime, duration);
      currentStats.maxTime = Math.max(currentStats.maxTime, duration);
      
      generalCache.set(statsKey, currentStats, 60 * 60 * 1000);
      
      return originalEnd.apply(this, args);
    };

    next();
  };
}

function getPerformanceStats() {
  const stats = {
    cache: {
      api: apiCache.getStats(),
      general: generalCache.getStats()
    },
    requests: {}
  };

  for (const [key, value] of generalCache.cache.entries()) {
    if (key.startsWith('perf:')) {
      const [, method, path] = key.split(':');
      const endpoint = `${method} ${path}`;
      stats.requests[endpoint] = value;
    }
  }

  return stats;
}

module.exports = {
  apiCacheMiddleware,
  performanceMiddleware,
  getPerformanceStats
};