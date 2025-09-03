/**
 * Configuration constants for the image collage system
 */
const COLLAGE_CONFIG = {
  LAYOUT_CACHE_SIZE: 20,
  IMAGE_CACHE_SIZE: 50,
  COLLAGE_CACHE_SIZE: 10,
  CANVAS_POOL_SIZE: 5,
  
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  MAX_CONCURRENT_LOADS: 3,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 100, // milliseconds
  
  MIN_DIMENSION: 100,
  MAX_DIMENSION: 2000,
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 800,
  DEFAULT_GAP: 4,
  MAX_GAP: 20,
  
  MAX_GRID_IMAGES: 6,
  MAX_STRIP_IMAGES: 4,
  MAX_FEATURED_IMAGES: 4,
  MIN_FEATURED_IMAGES: 3,
  
  SMALL_IMAGE_SIZE: 400,
  MEDIUM_IMAGE_SIZE: 800,
  LARGE_IMAGE_SIZE: 1200,
  
  MAX_ERRORS_PER_TYPE: 5,
  ERROR_REPORTING_WINDOW: 60000, // 1 minute
  
  CACHE_PREFIX: 'bc_collage_',
  
  JPEG_QUALITY: 0.9,
  PLACEHOLDER_QUALITY: 0.7,
  
  VALID_LAYOUT_TYPES: ['single', 'grid', 'strip', 'featured'],
  DEFAULT_LAYOUT_TYPE: 'single'
};


/**
 * Error reporting system for production monitoring
 */
const ErrorReporter = {
  errorCounts: new Map(),
  maxErrorsPerType: COLLAGE_CONFIG.MAX_ERRORS_PER_TYPE,
  reportingWindow: COLLAGE_CONFIG.ERROR_REPORTING_WINDOW,
  
  report(error, context = {}) {
    const errorType = error.name || 'UnknownError';
    const errorKey = `${errorType}:${error.message}`;
    
    const now = Date.now();
    const errorInfo = this.errorCounts.get(errorKey) || { count: 0, firstSeen: now, lastReported: 0 };
    
    errorInfo.count++;
    
    if (errorInfo.count <= this.maxErrorsPerType && 
        (now - errorInfo.lastReported) > this.reportingWindow) {
      
      const errorData = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context: {
          timestamp: now,
          userAgent: navigator.userAgent,
          url: window.location.href,
          ...context
        },
        frequency: {
          count: errorInfo.count,
          firstSeen: errorInfo.firstSeen
        }
      };
      
      console.error('Collage Error Report:', errorData);
      
      
      errorInfo.lastReported = now;
    }
    
    this.errorCounts.set(errorKey, errorInfo);
  },
  
  reset() {
    this.errorCounts.clear();
  }
};


/**
 * Layout calculation cache for common configurations
 */
const LayoutCache = {
  cache: new Map(),
  
  getKey(displayCount, width, height, gap) {
    return `${displayCount}-${width}-${height}-${gap}`;
  },
  
  get(displayCount, width, height, gap) {
    const key = this.getKey(displayCount, width, height, gap);
    return this.cache.get(key);
  },
  
  set(displayCount, width, height, gap, layout) {
    const key = this.getKey(displayCount, width, height, gap);
    this.cache.set(key, layout);
    
    if (this.cache.size > COLLAGE_CONFIG.LAYOUT_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
};

/**
 * Canvas object pool for reducing GC pressure
 */
const CanvasPool = {
  pool: [],
  maxPoolSize: COLLAGE_CONFIG.CANVAS_POOL_SIZE,
  
  get(width, height) {
    const canvas = this.pool.find(c => c.width === width && c.height === height);
    if (canvas) {
      this.pool = this.pool.filter(c => c !== canvas);
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      ctx.clearRect(0, 0, width, height);
      return canvas;
    }
    
    const newCanvas = document.createElement('canvas');
    newCanvas.width = width;
    newCanvas.height = height;
    return newCanvas;
  },
  
  release(canvas) {
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(canvas);
    }
  },
  
  cleanup() {
    this.pool = [];
  }
};

/**
 * Utility functions for common calculations
 */
const CollageUtils = {
  // Calculate layout positions with caching
  calculateLayout(displayCount, width, height, gap, layoutType = 'grid') {
    const cacheKey = `${displayCount}-${width}-${height}-${gap}-${layoutType}`;
    const cached = LayoutCache.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    let layout;
    
    if (layoutType === 'strip') {
      layout = this.calculateStripLayout(displayCount, width, height);
    } else if (layoutType === 'featured') {
      layout = this.calculateFeaturedLayout(displayCount, width, height, gap);
    } else {
      // Default grid layout
      layout = this.calculateGridLayout(displayCount, width, height, gap);
    }
    
    LayoutCache.cache.set(cacheKey, layout);
    return layout;
  },

  calculateGridLayout(displayCount, width, height, gap) {
    if (displayCount === 2) {
      return [
        { x: 0, y: 0, w: width / 2 - gap / 2, h: height },
        { x: width / 2 + gap / 2, y: 0, w: width / 2 - gap / 2, h: height }
      ];
    } else if (displayCount === 3) {
      return [
        { x: 0, y: 0, w: width / 2 - gap / 2, h: height },
        { x: width / 2 + gap / 2, y: 0, w: width / 2 - gap / 2, h: height / 2 - gap / 2 },
        { x: width / 2 + gap / 2, y: height / 2 + gap / 2, w: width / 2 - gap / 2, h: height / 2 - gap / 2 }
      ];
    } else if (displayCount === 4) {
      return [
        { x: 0, y: 0, w: width / 2 - gap / 2, h: height / 2 - gap / 2 },
        { x: width / 2 + gap / 2, y: 0, w: width / 2 - gap / 2, h: height / 2 - gap / 2 },
        { x: 0, y: height / 2 + gap / 2, w: width / 2 - gap / 2, h: height / 2 - gap / 2 },
        { x: width / 2 + gap / 2, y: height / 2 + gap / 2, w: width / 2 - gap / 2, h: height / 2 - gap / 2 }
      ];
    } else if (displayCount === 5) {
      // 3x2 grid with last image spanning two cells
      return [
        { x: 0, y: 0, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: width / 3 + gap / 3, y: 0, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: width * 2 / 3 + gap * 2 / 3, y: 0, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: 0, y: height / 2 + gap / 2, w: width / 2 - gap / 2, h: height / 2 - gap / 2 },
        { x: width / 2 + gap / 2, y: height / 2 + gap / 2, w: width / 2 - gap / 2, h: height / 2 - gap / 2 }
      ];
    } else { // displayCount === 6
      // 3x2 grid
      return [
        { x: 0, y: 0, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: width / 3 + gap / 3, y: 0, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: width * 2 / 3 + gap * 2 / 3, y: 0, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: 0, y: height / 2 + gap / 2, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: width / 3 + gap / 3, y: height / 2 + gap / 2, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 },
        { x: width * 2 / 3 + gap * 2 / 3, y: height / 2 + gap / 2, w: width / 3 - gap * 2 / 3, h: height / 2 - gap / 2 }
      ];
    }
  },

  // Calculate strip layout (horizontal strip, no gaps)
  calculateStripLayout(displayCount, width, height) {
    const layout = [];
    const imageWidth = width / displayCount;
    
    for (let i = 0; i < displayCount; i++) {
      layout.push({
        x: i * imageWidth,
        y: 0,
        w: imageWidth,
        h: height
      });
    }
    
    return layout;
  },

  // Calculate featured layout (1 large + smaller images on right)
  calculateFeaturedLayout(displayCount, width, height, gap) {
    if (displayCount < 3) {
      // Fall back to grid layout for insufficient images
      return this.calculateGridLayout(displayCount, width, height, gap);
    }
    
    const layout = [];
    const mainImageWidth = width * 0.6; // 60% for main image
    const sideImageWidth = width * 0.4 - gap; // 40% minus gap for side images
    const sideImagesCount = displayCount - 1;
    const sideImageHeight = height / sideImagesCount - (gap * (sideImagesCount - 1)) / sideImagesCount;
    
    // Main image (left side)
    layout.push({
      x: 0,
      y: 0,
      w: mainImageWidth,
      h: height
    });
    
    // Side images (right side, stacked vertically)
    for (let i = 0; i < sideImagesCount; i++) {
      layout.push({
        x: mainImageWidth + gap,
        y: i * (sideImageHeight + gap),
        w: sideImageWidth,
        h: sideImageHeight
      });
    }
    
    return layout;
  },
  
  isMissingImage(url) {
    return url && (
      url.includes('/missing.png') ||
      url.includes('assets-dev.bigcartel.biz/missing.png') ||
      url.includes('assets.bigcartel.biz/missing.png') ||
      url.includes('assets.bigcartel.com/missing.png')
    );
  },
  
  // Calculate font size with caching
  calculateFontSize(fontSizeBaseDimension, digits) {
    let fontSizeMultiplier;
    if (digits === 1) {
      fontSizeMultiplier = 0.75;
    } else if (digits === 2) {
      fontSizeMultiplier = 0.68;
    } else if (digits === 3) {
      fontSizeMultiplier = 0.62;
    } else {
      fontSizeMultiplier = 0.58;
    }
    return fontSizeBaseDimension * fontSizeMultiplier;
  },
  
};


/**
 * Persistent collage cache using IndexedDB for larger storage capacity
 */
const CollageStorage = {
  CACHE_DURATION: COLLAGE_CONFIG.CACHE_DURATION,
  MAX_CACHE_SIZE: COLLAGE_CONFIG.COLLAGE_CACHE_SIZE,
  DB_NAME: 'BigCartelCollageCache',
  DB_VERSION: 1,
  STORE_NAME: 'collages',
  
  // Database connection
  db: null,
  dbInitPromise: null,
  
  // Initialize IndexedDB
  async initDB() {
    if (this.db) return this.db;
    if (this.dbInitPromise) return this.dbInitPromise;
    
    this.dbInitPromise = new Promise((resolve, reject) => {
      
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(new Error('IndexedDB open failed'));
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'cacheKey' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('categoryId', 'categoryId', { unique: false });
        }
      };
    });
    
    return this.dbInitPromise;
  },
  
  // Fallback to localStorage if IndexedDB fails
  useLocalStorageFallback: false,
  
  // Check if we're in customization/preview mode
  isPreviewMode() {
    // Primary detection: BigCartel draft hostname pattern
    const isDraftHostname = /^draft-.*\.bigcartel\./.test(window.location.hostname);
    
    // Secondary detection: iframe (customization previewer)
    const isInIframe = window.self !== window.top;
    
    // Combined detection for maximum reliability
    return isDraftHostname || isInIframe;
  },
  
  // Generate cache key from collage parameters
  generateCacheKey(categoryId, layoutType, imageUrls, width, height) {
    // Create a stable hash of image URLs
    const urlHash = this.hashString(imageUrls.join('|'));
    return `${this.CACHE_PREFIX}${categoryId}_${layoutType}_${urlHash}_${width}x${height}`;
  },
  
  // Simple string hash function
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  },
  
  // Get cached collage if valid
  async get(categoryId, layoutType, imageUrls, width, height) {
    if (this.isPreviewMode()) {
      return null; // Skip cache in preview mode
    }
    
    const cacheKey = this.generateCacheKey(categoryId, layoutType, imageUrls, width, height);
    
    try {
      // Try IndexedDB first
      if (!this.useLocalStorageFallback) {
        try {
          const db = await this.initDB();
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);
          
          const getRequest = store.get(cacheKey);
          const data = await new Promise((resolve, reject) => {
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
          });
          
          if (!data) return null;
          
          const now = Date.now();
          
          // Check if cache is expired
          if (now - data.timestamp > this.CACHE_DURATION) {
            // Delete expired entry
            store.delete(cacheKey);
            return null;
          }
          
          // Update access time for LRU
          data.lastAccessed = now;
          store.put(data);
          
          return data.dataUrl;
        } catch (indexedDBError) {
          console.warn('IndexedDB failed, falling back to localStorage:', indexedDBError);
          this.useLocalStorageFallback = true;
        }
      }
      
      // localStorage fallback
      try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is expired
        if (now - data.timestamp > this.CACHE_DURATION) {
          localStorage.removeItem(cacheKey);
          return null;
        }
        
        // Update access time for LRU
        data.lastAccessed = now;
        localStorage.setItem(cacheKey, JSON.stringify(data));
        
        return data.dataUrl;
      } catch (e) {
        console.warn('localStorage access failed:', e);
        return null;
      }
      
      return null;
    } catch (e) {
      ErrorReporter.report(e, { component: 'CollageStorage', operation: 'get', cacheKey });
      console.warn('Error reading collage cache:', e);
      return null;
    }
  },
  
  // Store collage in cache
  async set(categoryId, layoutType, imageUrls, width, height, dataUrl) {
    if (this.isPreviewMode()) {
      return; // Skip cache in preview mode
    }
    
    const cacheKey = this.generateCacheKey(categoryId, layoutType, imageUrls, width, height);
    const now = Date.now();
    
    const data = {
      cacheKey,
      dataUrl,
      timestamp: now,
      lastAccessed: now,
      categoryId,
      layoutType,
      imageUrls: imageUrls.slice(0, 3), // Store first 3 URLs for debugging
      size: `${width}x${height}`
    };
    
    try {
      // Try IndexedDB first
      if (!this.useLocalStorageFallback) {
        try {
          const db = await this.initDB();
          const transaction = db.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);
          
          await new Promise((resolve, reject) => {
            const putRequest = store.put(data);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });
          
          // Cleanup old entries periodically
          this.cleanup();
          return;
        } catch (indexedDBError) {
          console.warn('IndexedDB failed, falling back to localStorage:', indexedDBError);
          this.useLocalStorageFallback = true;
        }
      }
      
      // localStorage fallback
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        this.cleanup();
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, performing cleanup');
          this.cleanup(true);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (e2) {
            console.warn('Still unable to cache after cleanup - storage full');
          }
        } else {
          console.warn('localStorage access failed:', e);
        }
      }
      
    } catch (e) {
      ErrorReporter.report(e, { component: 'CollageStorage', operation: 'set', cacheKey });
      console.warn('Error storing collage cache:', e);
    }
  },
  
  // Clean up old cache entries
  async cleanup(aggressive = false) {
    try {
      if (!this.useLocalStorageFallback) {
        try {
          await this.cleanupIndexedDB(aggressive);
          return;
        } catch (e) {
          console.warn('IndexedDB cleanup failed, using localStorage cleanup:', e);
          this.useLocalStorageFallback = true;
        }
      }
      
      this.cleanupLocalStorage(aggressive);
    } catch (e) {
      ErrorReporter.report(e, { component: 'CollageStorage', operation: 'cleanup' });
      console.warn('Error during cache cleanup:', e);
    }
  },
  
  async cleanupIndexedDB(aggressive = false) {
    const db = await this.initDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('timestamp');
    
    const now = Date.now();
    const cutoffTime = now - this.CACHE_DURATION;
    
    // Remove expired entries
    const expiredRange = IDBKeyRange.upperBound(cutoffTime);
    await new Promise((resolve, reject) => {
      const deleteRequest = index.openCursor(expiredRange);
      deleteRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    
    if (aggressive) {
      const allEntries = await new Promise((resolve, reject) => {
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
      
      if (allEntries.length > this.MAX_CACHE_SIZE) {
        allEntries
          .sort((a, b) => a.lastAccessed - b.lastAccessed)
          .slice(0, allEntries.length - this.MAX_CACHE_SIZE)
          .forEach(entry => store.delete(entry.cacheKey));
      }
    }
  },
  
  cleanupLocalStorage(aggressive = false) {
    const entries = [];
    const now = Date.now();
    
    // Collect all collage cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bc_collage_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          entries.push({
            key,
            lastAccessed: data.lastAccessed || data.timestamp,
            timestamp: data.timestamp,
            age: now - data.timestamp
          });
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }
    
    // Remove expired entries
    entries.forEach(entry => {
      if (entry.age > this.CACHE_DURATION) {
        localStorage.removeItem(entry.key);
      }
    });
    
    // If still too many entries or aggressive cleanup requested
    const validEntries = entries.filter(e => e.age <= this.CACHE_DURATION);
    const excessEntries = aggressive ? validEntries.length : validEntries.length - this.MAX_CACHE_SIZE;
    
    if (excessEntries > 0) {
      // Remove least recently accessed entries
      validEntries
        .sort((a, b) => a.lastAccessed - b.lastAccessed)
        .slice(0, excessEntries)
        .forEach(entry => localStorage.removeItem(entry.key));
    }
  },
  
  // Get cache statistics
  async getStats() {
    try {
      let entries = [];
      const now = Date.now();
      
      // Try IndexedDB first
      if (!this.useLocalStorageFallback) {
        try {
          const db = await this.initDB();
          const transaction = db.transaction([this.STORE_NAME], 'readonly');
          const store = transaction.objectStore(this.STORE_NAME);
          
          const allEntries = await new Promise((resolve, reject) => {
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
          });
          
          entries = allEntries.map(data => ({
            key: data.cacheKey,
            age: now - data.timestamp,
            categoryId: data.categoryId,
            layoutType: data.layoutType,
            size: data.size
          }));
        } catch (e) {
          this.useLocalStorageFallback = true;
        }
      }
      
      // localStorage fallback
      if (this.useLocalStorageFallback) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('bc_collage_')) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              entries.push({
                key,
                age: now - data.timestamp,
                categoryId: data.categoryId,
                layoutType: data.layoutType,
                size: data.size
              });
            } catch (e) {
              // Invalid entry
            }
          }
        }
        } catch (e) {
          console.warn('localStorage access failed:', e);
        }
      }
      
      return {
        totalEntries: entries.length,
        previewMode: this.isPreviewMode(),
        storageType: this.useLocalStorageFallback ? 'localStorage' : 'IndexedDB',
        oldestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.age)) : 0,
        newestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.age)) : 0
      };
    } catch (e) {
      return {
        totalEntries: 0,
        previewMode: this.isPreviewMode(),
        storageType: 'unavailable',
        error: e.message
      };
    }
  }
};

/**
 * Image cache and loading queue management
 */
const ImageCollageCache = {
  cache: new Map(),
  maxCacheSize: COLLAGE_CONFIG.IMAGE_CACHE_SIZE,
  loadingQueue: [],
  activeLoads: 0,
  maxConcurrentLoads: COLLAGE_CONFIG.MAX_CONCURRENT_LOADS,

  // LRU cache implementation
  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  },

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxCacheSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  },

  // Process the loading queue
  processQueue() {
    while (this.activeLoads < this.maxConcurrentLoads && this.loadingQueue.length > 0) {
      const task = this.loadingQueue.shift();
      this.activeLoads++;
      task.execute().finally(() => {
        this.activeLoads--;
        this.processQueue();
      });
    }
  },

  // Add a loading task to the queue
  queueLoad(url, optimizedSize = null) {
    const cacheKey = optimizedSize ? `${url}@${optimizedSize}` : url;
    const cached = this.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    return new Promise((resolve, reject) => {
      const task = {
        execute: () => this.loadImageWithRetry(url, optimizedSize, 3)
          .then(img => {
            this.set(cacheKey, img);
            resolve(img);
          })
          .catch(reject)
      };

      this.loadingQueue.push(task);
      this.processQueue();
    });
  },

  // Load image with retry mechanism
  async loadImageWithRetry(url, optimizedSize, maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const img = await this.loadSingleImage(url, optimizedSize);
        return img;
      } catch (error) {
        lastError = error;
        console.warn(`Image load attempt ${attempt}/${maxRetries} failed for ${url}:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delay = 100 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  },

  // Load a single image with CORS support for canvas operations
  loadSingleImage(url, optimizedSize) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Always use CORS for canvas operations - Big Cartel supports this
      img.crossOrigin = 'Anonymous';

      const finalUrl = optimizedSize ? this.getOptimizedUrl(url, optimizedSize) : this.normalizeUrl(url);

      img.onload = () => {
        resolve(img);
      };

      img.onerror = (error) => {
        // If CORS fails, try without crossOrigin as fallback
        console.warn(`CORS failed for ${finalUrl}, retrying without crossOrigin`);
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error(`Failed to load image: ${finalUrl}`));
        fallbackImg.src = finalUrl;
      };

      img.src = finalUrl;
    });
  },

  // Normalize URL protocol to match page protocol
  normalizeUrl(url) {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:' && url.startsWith('https:')) {
      return url.replace('https:', 'http:');
    }
    return url;
  },

  getOptimizedUrl(url, targetSize) {
    let finalUrl = url;
    
    // Handle protocol mismatch - if page is HTTP but image is HTTPS, convert to HTTP
    if (typeof window !== 'undefined' && window.location.protocol === 'http:' && url.startsWith('https:')) {
      finalUrl = url.replace('https:', 'http:');
    }
    
    // For Big Cartel URLs, we can append size constraints
    if (finalUrl.includes('bigcartel') || finalUrl.includes('bc-img')) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      return `${finalUrl}${separator}constrain=${targetSize}`;
    }
    return finalUrl;
  }
};

/**
 * Creates a collage from multiple images with intelligent layout
 * @param {string[]} imageUrls - Array of image URLs (1 or more)
 * @param {number} width - Width of the output collage in pixels
 * @param {number} height - Height of the output collage in pixels
 * @param {number} gap - Gap between images in pixels (default: 4)
 * @param {string} layoutType - Layout type: 'single', 'grid', 'strip', or 'featured' (default: 'single')
 * @param {string|null} categoryId - Category ID for cache key (optional)
 * @return {Promise<string>} - Promise that resolves with the data URL of the collage
 */
function createCollage(imageUrls, width = 800, height = 800, gap = 4, layoutType = COLLAGE_CONFIG.DEFAULT_LAYOUT_TYPE, categoryId = null) {
  return new Promise((resolve, reject) => {
    // Input validation and sanitization
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      reject(new Error('Please provide a valid array of image URLs'));
      return;
    }

    // Sanitize and validate inputs
    width = Math.max(COLLAGE_CONFIG.MIN_DIMENSION, Math.min(COLLAGE_CONFIG.MAX_DIMENSION, Number(width) || COLLAGE_CONFIG.DEFAULT_WIDTH));
    height = Math.max(COLLAGE_CONFIG.MIN_DIMENSION, Math.min(COLLAGE_CONFIG.MAX_DIMENSION, Number(height) || COLLAGE_CONFIG.DEFAULT_HEIGHT));
    gap = Math.max(0, Math.min(COLLAGE_CONFIG.MAX_GAP, Number(gap) || COLLAGE_CONFIG.DEFAULT_GAP));
    
    // Validate layout type
    if (!COLLAGE_CONFIG.VALID_LAYOUT_TYPES.includes(layoutType)) {
      console.warn(`Invalid layoutType '${layoutType}' provided to createCollage. Falling back to '${COLLAGE_CONFIG.DEFAULT_LAYOUT_TYPE}'.`);
      layoutType = COLLAGE_CONFIG.DEFAULT_LAYOUT_TYPE;
    }

    // Calculate optimal image size for loading
    const maxDimension = Math.max(width, height);
    const optimizedSize = maxDimension <= COLLAGE_CONFIG.SMALL_IMAGE_SIZE ? COLLAGE_CONFIG.SMALL_IMAGE_SIZE : 
                         maxDimension <= COLLAGE_CONFIG.MEDIUM_IMAGE_SIZE ? COLLAGE_CONFIG.MEDIUM_IMAGE_SIZE : 
                         COLLAGE_CONFIG.LARGE_IMAGE_SIZE;

    // Only process enough URLs to get the images we need
    const maxNeeded = layoutType === 'strip' ? COLLAGE_CONFIG.MAX_STRIP_IMAGES : 
                      layoutType === 'featured' ? COLLAGE_CONFIG.MAX_FEATURED_IMAGES : 
                      COLLAGE_CONFIG.MAX_GRID_IMAGES;
    
    // Check a reasonable number of URLs (10x what we need) to avoid O(n) for large categories
    const checkLimit = Math.min(maxNeeded * 10, imageUrls.length);
    const limitedUrls = imageUrls.slice(0, checkLimit);
    const validImageUrls = limitedUrls.filter(url => !CollageUtils.isMissingImage(url));

    if (validImageUrls.length === 0) {
      resolve(imageUrls[0]);
      return;
    }

    // Check cache first (if we have a categoryId for cache key)
    if (categoryId) {
      CollageStorage.get(categoryId, layoutType, validImageUrls, width, height)
        .then(cachedResult => {
          if (cachedResult) {
            resolve(cachedResult);
            return;
          }
          // Continue with collage generation if no cache hit
          generateCollage();
        })
        .catch(error => {
          ErrorReporter.report(error, { component: 'createCollage', operation: 'cacheGet', categoryId });
          console.warn('Cache get failed, proceeding with generation:', error);
          // Continue with collage generation if cache fails
          generateCollage();
        });
      return;
    }
    
    // If no categoryId, proceed directly to generation
    generateCollage();
    
    function generateCollage() {

    const isEffectivelySingle = validImageUrls.length === 1 || layoutType === 'single';

    // Handle the case where only one valid image remains OR single layout is requested
    if (isEffectivelySingle) {
      ImageCollageCache.queueLoad(validImageUrls[0], optimizedSize)
        .then(img => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: false });

          drawCroppedImage(ctx, img, 0, 0, width, height);

          try {
            const result = canvas.toDataURL('image/jpeg', COLLAGE_CONFIG.JPEG_QUALITY);
            // Cache the result (async, don't wait)
            if (categoryId) {
              CollageStorage.set(categoryId, layoutType, validImageUrls, width, height, result)
                .catch(error => {
                  ErrorReporter.report(error, { component: 'createCollage', operation: 'cacheSet', categoryId });
                  console.warn('Failed to cache result:', error);
                });
            }
            resolve(result);
          } catch (error) {
            if (error.name === 'SecurityError') {
              console.warn('Canvas tainted, falling back to original image URL:', validImageUrls[0]);
              resolve(validImageUrls[0]);
            } else {
              throw error;
            }
          }
        })
        .catch(error => {
          ErrorReporter.report(error, { 
            component: 'createCollage', 
            operation: 'singleImageLoad',
            imageUrl: validImageUrls[0],
            layoutType 
          });
          console.error(`Failed to load single image: ${validImageUrls[0]}`, error);
          // Generate fallback canvas
          const fallbackCanvas = createSolidColorFallback(width, height, '#f5f5f5');
          resolve(fallbackCanvas.toDataURL('image/jpeg', COLLAGE_CONFIG.JPEG_QUALITY));
        });
      return;
    }

    // --- Collage Path (2 or more valid images) ---
    // Determine max images based on layout type
    let maxImages;
    if (layoutType === 'strip') {
      maxImages = COLLAGE_CONFIG.MAX_STRIP_IMAGES;
    } else if (layoutType === 'featured') {
      maxImages = COLLAGE_CONFIG.MAX_FEATURED_IMAGES;
    } else {
      maxImages = COLLAGE_CONFIG.MAX_GRID_IMAGES;
    }
    
    const displayCount = Math.min(validImageUrls.length, maxImages);
    
    // Handle insufficient images for featured layout
    if (layoutType === 'featured' && displayCount < COLLAGE_CONFIG.MIN_FEATURED_IMAGES) {
      // Fall back to single image or grid layout
      if (displayCount === 1) {
        // Handle as single image
        ImageCollageCache.queueLoad(validImageUrls[0], optimizedSize)
          .then(img => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: false });

            drawCroppedImage(ctx, img, 0, 0, width, height);

            try {
              resolve(canvas.toDataURL('image/jpeg', 0.9));
            } catch (error) {
              if (error.name === 'SecurityError') {
                console.warn('Canvas tainted, falling back to original image URL:', validImageUrls[0]);
                resolve(validImageUrls[0]);
              } else {
                throw error;
              }
            }
          })
          .catch(error => {
            console.error(`Failed to load single image: ${validImageUrls[0]}`, error);
            const fallbackCanvas = createSolidColorFallback(width, height, '#f5f5f5');
            resolve(fallbackCanvas.toDataURL('image/jpeg', COLLAGE_CONFIG.JPEG_QUALITY));
          });
        return;
      } else {
        // Use grid layout for 2 images
        layoutType = 'grid';
      }
    }
    
    const layout = CollageUtils.calculateLayout(displayCount, width, height, gap, layoutType);

    const canvas = CanvasPool.get(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Enhanced image loading using cache and queue
    const loadImage = (url) => {
      return ImageCollageCache.queueLoad(url, optimizedSize)
        .catch((err) => {
          console.warn(`Failed to load image after retries: ${url}`, err);
          return null;
        });
    };

    Promise.all(validImageUrls.slice(0, displayCount).map(loadImage))
      .then(loadedImages => {
        const validImages = loadedImages.filter(img => img !== null);

        if (validImages.length === 0) {
          // Enhanced fallback strategy
          const firstMissingImage = imageUrls.find(url => CollageUtils.isMissingImage(url));
          if (firstMissingImage) {
            resolve(firstMissingImage);
          } else {
            // Generate a solid color fallback
            console.warn('All images failed to load, generating solid color fallback');
            const fallbackCanvas = createSolidColorFallback(width, height, '#f5f5f5');
            resolve(fallbackCanvas.toDataURL('image/jpeg', COLLAGE_CONFIG.JPEG_QUALITY));
          }
          return;
        }

        drawCollage(validImages);
      })
      .catch(error => {
        // This catch is primarily for unexpected errors within the Promise.all setup itself,
        // as individual image load errors are handled by resolving to null in `loadImage`.
        ErrorReporter.report(error, {
          component: 'createCollage',
          operation: 'imageLoadingError',
          layoutType,
          imageCount: validImageUrls.length,
          displayCount
        });
        console.error("Unexpected error during image loading:", error);
        reject(new Error('An unexpected error occurred while loading images.'));
      });

    /**
     * Draws an image cropped to fill the given dimensions
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLImageElement} img - Image to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    function drawCroppedImage(ctx, img, x, y, width, height) {
      const aspectRatio = img.width / img.height;
      const targetRatio = width / height;

      let sourceX, sourceY, sourceWidth, sourceHeight;

      if (aspectRatio > targetRatio) {
        sourceHeight = img.height;
        sourceWidth = sourceHeight * targetRatio;
        sourceX = (img.width - sourceWidth) / 2;
        sourceY = 0;
      } else {
        sourceWidth = img.width;
        sourceHeight = sourceWidth / targetRatio;
        sourceX = 0;
        sourceY = (img.height - sourceHeight) / 2;
      }

      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        x, y, width, height
      );
    }


    /**
     * Draws the collage using the provided valid images and layout.
     * @param {HTMLImageElement[]} validImages - Array of successfully loaded image objects.
     */
    function drawCollage(validImages) {
      // Draw each loaded image into its designated slot in the layout
      validImages.forEach((img, i) => {
        if (i >= layout.length) return; // Should not happen with current logic, but safe guard
        const position = layout[i];
        drawCroppedImage(ctx, img, position.x, position.y, position.w, position.h);
      });


      // Resolve the promise with the generated collage image data URL
      try {
        const result = canvas.toDataURL('image/jpeg', COLLAGE_CONFIG.JPEG_QUALITY);
        // Cache the result (async, don't wait)
        if (categoryId) {
          CollageStorage.set(categoryId, layoutType, validImageUrls, width, height, result)
            .catch(error => {
              ErrorReporter.report(error, { component: 'createCollage', operation: 'cacheSetCollage', categoryId });
              console.warn('Failed to cache collage result:', error);
            });
        }
        // Release canvas back to pool for reuse
        CanvasPool.release(canvas);
        resolve(result);
      } catch (error) {
        if (error.name === 'SecurityError') {
          console.warn('Canvas tainted, falling back to first image URL');
          // Release canvas back to pool
          CanvasPool.release(canvas);
          // Return the first valid image URL as fallback
          resolve(validImageUrls[0]);
        } else {
          CanvasPool.release(canvas);
          throw error;
        }
      }
    }
    } // End generateCollage function
  });
}

/**
 * Creates a solid color fallback canvas when all images fail to load
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} color - Fallback color (hex)
 * @returns {HTMLCanvasElement} - Canvas with solid color
 */
function createSolidColorFallback(width, height, color = '#f5f5f5') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  // Add a subtle pattern to indicate this is a fallback
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(10, 10, width - 20, height - 20);
  
  return canvas;
}

/**
 * Process a single container by creating and applying a collage
 * @param {HTMLElement} container - Container element with collage data attributes
 * @param {object} collageOptions - Options passed to `createCollage` (width, height, gap).
 */
function processContainer(container, collageOptions = {}) {
  const categoryId = container.id.replace('category-collage-', '');

  // --- Read configuration from data attributes ---
  const imageUrlsAttr = container.getAttribute('data-image-urls');
  const imageStyle = container.getAttribute('data-image-style') || 'single';

  if (!imageUrlsAttr) {
    console.warn(`No image URLs found for container: ${categoryId}`);
    return;
  }

  let imageUrls;
  try {
    imageUrls = JSON.parse(imageUrlsAttr);
  } catch (e) {
    console.error(`Failed to parse image URLs for container ${categoryId}:`, e);
    return;
  }

  if (!imageUrls || !imageUrls.length) {
    console.warn(`Empty image URL list for container: ${categoryId}`);
    return;
  }

  // If only one image, use original URL directly - let CSS handle object-fit for themes that support it
  if (imageUrls.length === 1) {
    const img = container.querySelector('img');
    if (img) {
      img.src = imageUrls[0];
      img.classList.remove('loading');
      img.classList.add('lazyloaded');
    }
    return;
  }

  // Validate and sanitize layout type
  let layoutType;
  if (COLLAGE_CONFIG.VALID_LAYOUT_TYPES.includes(imageStyle)) {
    layoutType = imageStyle;
  } else {
    console.warn(`Invalid layout type '${imageStyle}' for container ${categoryId}. Falling back to '${COLLAGE_CONFIG.DEFAULT_LAYOUT_TYPE}'.`);
    layoutType = COLLAGE_CONFIG.DEFAULT_LAYOUT_TYPE;
  }

  const finalCollageOptions = {
    width: 800,
    height: 800,
    gap: 1,
    ...collageOptions
  };

  const img = container.querySelector('img');
  if (img) {
    img.classList.add('collage-image', 'loading');
    img.classList.remove('lazyload');
    img.removeAttribute('data-srcset');
    
    const placeholderCanvas = createSolidColorFallback(800, 800, '#f8f8f8');
    const placeholderUrl = placeholderCanvas.toDataURL('image/jpeg', COLLAGE_CONFIG.PLACEHOLDER_QUALITY);
    img.src = placeholderUrl;
    img.classList.add('lazyloaded');
  }

  createCollage(
    imageUrls,
    finalCollageOptions.width,
    finalCollageOptions.height,
    finalCollageOptions.gap,
    layoutType,
    categoryId
  )
    .then(collageUrl => {
      if (img) {
        requestAnimationFrame(() => {
          img.onload = () => {
            requestAnimationFrame(() => {
              img.classList.remove('loading');
            });
            img.onload = null;
            img.onerror = null;
          };
          img.onerror = () => {
            console.error(`Failed to load generated collage data URL for ${categoryId}`);
            img.classList.remove('loading');
            img.onload = null;
            img.onerror = null;
          };

          img.src = collageUrl;
        });
      } else {
        console.warn(`No img element found within container: ${categoryId}`);
      }
    })
    .catch(error => {
      console.error(`Failed to create or apply collage for category ID ${categoryId}:`, error);
      if (img) {
        img.classList.remove('loading');
      }
    });
}

/**
 * Global cleanup and memory management
 */
const CollageManager = {
  observers: new Set(),
  
  // Cleanup all resources
  cleanup() {
    // Cleanup all caches
    LayoutCache.cache.clear();
    ImageCollageCache.cache.clear();
    CollageStorage.cleanup(true); // Aggressive cleanup
    
    // Cleanup canvas pool
    CanvasPool.cleanup();
    
    // Cleanup intersection observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  },
  
  addObserver(observer) {
    this.observers.add(observer);
  }
};

// Debounced intersection handler for better performance
function createDebouncedHandler(callback, delay = 16) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback.apply(this, args), delay);
  };
}

/**
 * Sets up lazy loading for category collages using Intersection Observer
 * @param {object} options - Configuration options.
 * @param {object} [options.collage={}] - Options to pass to `createCollage` (e.g., width, height, gap).
 * @param {object} [options.observer={}] - Options for the `IntersectionObserver` (e.g., rootMargin, threshold).
 */
function setupCategoryCollages(options = {}) {
  // Destructure options with defaults
  const { collage: collageOptions = {}, observer: observerOptions = {} } = options;

  const finalObserverOptions = {
    rootMargin: '200px 0px', // Start loading when the element is 200px away from the viewport
    threshold: 0.01,         // Trigger when at least 1% of the element is visible
    ...observerOptions
  };

  // Debounced handler for better performance
  const debouncedHandler = createDebouncedHandler((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const container = entry.target;
        // Process the container to generate and apply the collage
        processContainer(container, collageOptions);
        // Once processed, stop observing this container to prevent reprocessing
        observer.unobserve(container);
      }
    });
  });

  const observer = new IntersectionObserver(debouncedHandler, finalObserverOptions);
  
  // Add to cleanup manager
  CollageManager.addObserver(observer);

  // Select all potential category collage containers on the page
  const categoryContainers = document.querySelectorAll('[id^="category-collage-"]');

  categoryContainers.forEach(container => {
    observer.observe(container);
  });
  
  return observer; // Return observer for manual cleanup if needed
}

window.collageDebug = async function() {
  const stats = await CollageStorage.getStats();
  console.log('Collage Cache Stats:', stats);
  console.log('Image Cache Size:', ImageCollageCache.cache.size);
  console.log('Layout Cache Size:', LayoutCache.cache.size);
  return stats;
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    CollageManager.cleanup();
  });
}
