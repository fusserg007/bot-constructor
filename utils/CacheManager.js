/**
 * Менеджер кэширования для оптимизации производительности
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    };
    this.maxSize = 1000;
    this.ttl = 5 * 60 * 1000; // 5 минут
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.cacheStats.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      this.cacheStats.size--;
      return null;
    }
    
    item.lastAccessed = Date.now();
    this.cacheStats.hits++;
    return item.value;
  }

  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl;
    const expires = Date.now() + ttl;
    
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const item = {
      value,
      expires,
      created: Date.now(),
      lastAccessed: Date.now()
    };
    
    const isNew = !this.cache.has(key);
    this.cache.set(key, item);
    if (isNew) {
      this.cacheStats.size++;
    }
    this.cacheStats.sets++;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.cacheStats.deletes++;
      this.cacheStats.size--;
    }
    return deleted;
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheStats.size = 0;
    this.cacheStats.deletes += size;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    this.cacheStats.size -= cleaned;
    this.cacheStats.deletes += cleaned;
    return cleaned;
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;
    return {
      ...this.cacheStats,
      hitRate: parseFloat(hitRate),
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }

  getSizeInfo() {
    let totalSize = 0;
    for (const [key, item] of this.cache.entries()) {
      totalSize += JSON.stringify(item).length;
    }
    return {
      items: this.cache.size,
      bytesApprox: totalSize,
      kbApprox: (totalSize / 1024).toFixed(2)
    };
  }
}

// API Cache для кэширования запросов
class APICache extends CacheManager {
  constructor() {
    super();
    this.maxSize = 500;
    this.ttl = 2 * 60 * 1000; // 2 минуты для API
  }

  generateKey(method, url, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? JSON.stringify(params) 
      : '';
    return `${method}:${url}:${paramString}`;
  }

  cacheGET(url, params, response) {
    const key = this.generateKey('GET', url, params);
    this.set(key, response);
    return key;
  }

  getCachedGET(url, params) {
    const key = this.generateKey('GET', url, params);
    return this.get(key);
  }
}

// Глобальные экземпляры кэшей
const apiCache = new APICache();
const generalCache = new CacheManager();

module.exports = {
  CacheManager,
  APICache,
  apiCache,
  generalCache
};