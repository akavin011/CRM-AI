// Performance optimization utilities
import React from 'react';

export class PerformanceService {
  // Debounce function to limit function calls
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  // Throttle function to limit function calls
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Memoization for expensive calculations
  static memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
    const cache = new Map();
    return (...args) => {
      const key = keyGenerator(...args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    };
  }

  // Lazy loading for images
  static lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // Virtual scrolling for large lists
  static createVirtualScroller({
    container,
    itemHeight,
    totalItems,
    renderItem,
    buffer = 5
  }) {
    let scrollTop = 0;
    let containerHeight = container.clientHeight;
    let visibleItems = Math.ceil(containerHeight / itemHeight);
    let startIndex = 0;
    let endIndex = Math.min(startIndex + visibleItems + buffer, totalItems);

    const updateVisibleItems = () => {
      startIndex = Math.floor(scrollTop / itemHeight);
      endIndex = Math.min(startIndex + visibleItems + buffer, totalItems);
    };

    const render = () => {
      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i < endIndex; i++) {
        const item = renderItem(i);
        fragment.appendChild(item);
      }
      container.innerHTML = '';
      container.appendChild(fragment);
    };

    const handleScroll = this.throttle((e) => {
      scrollTop = e.target.scrollTop;
      updateVisibleItems();
      render();
    }, 16); // 60fps

    container.addEventListener('scroll', handleScroll);
    render();

    return {
      destroy: () => container.removeEventListener('scroll', handleScroll)
    };
  }

  // Code splitting helper
  static async loadComponent(importFn) {
    try {
      const module = await importFn();
      return module.default || module;
    } catch (error) {
      console.error('Failed to load component:', error);
      return null;
    }
  }

  // Bundle analyzer for development
  static analyzeBundle() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Bundle Analysis:');
      console.log('Total JS files:', document.querySelectorAll('script[src]').length);
      console.log('Total CSS files:', document.querySelectorAll('link[rel="stylesheet"]').length);
      console.log('Total images:', document.querySelectorAll('img').length);
    }
  }

  // Memory usage monitoring
  static monitorMemory() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100,
        total: Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100,
        limit: Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100
      };
    }
    return null;
  }

  // Performance metrics collection
  static collectMetrics() {
    const metrics = {};

    // Navigation timing
    if (performance.timing) {
      const timing = performance.timing;
      metrics.navigation = {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: timing.responseEnd - timing.requestStart
      };
    }

    // Resource timing
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      metrics.resources = {
        total: resources.length,
        totalSize: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
        averageLoadTime: resources.reduce((sum, resource) => sum + resource.duration, 0) / resources.length
      };
    }

    // Memory usage
    metrics.memory = this.monitorMemory();

    return metrics;
  }

  // Image optimization
  static optimizeImage(src, options = {}) {
    const {
      width,
      height,
      quality = 80,
      format = 'webp'
    } = options;

    // In a real app, you'd use a service like Cloudinary or ImageKit
    // This is a placeholder for the optimization logic
    return src;
  }

  // Preload critical resources
  static preloadResources(resources) {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as || 'script';
      if (resource.crossOrigin) {
        link.crossOrigin = resource.crossOrigin;
      }
      document.head.appendChild(link);
    });
  }

  // Service worker registration for caching
  static async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Critical CSS inlining
  static inlineCriticalCSS(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.insertBefore(style, document.head.firstChild);
  }

  // Resource hints
  static addResourceHints() {
    const hints = [
      { rel: 'dns-prefetch', href: '//api.example.com' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' }
    ];

    hints.forEach(hint => {
      const link = document.createElement('link');
      Object.assign(link, hint);
      document.head.appendChild(link);
    });
  }

  // Bundle splitting strategy
  static createChunkStrategy() {
    return {
      vendor: ['react', 'react-dom', 'react-router-dom'],
      ui: ['framer-motion', 'lucide-react'],
      charts: ['recharts'],
      utils: ['react-query', 'react-hot-toast']
    };
  }

  // Lazy loading for components
  static createLazyComponent(importFn, fallback = null) {
    return React.lazy(importFn);
  }

  // Intersection Observer for animations
  static createIntersectionObserver(callback, options = {}) {
    const defaultOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    return new IntersectionObserver(callback, { ...defaultOptions, ...options });
  }

  // Web Workers for heavy computations
  static createWorker(workerFunction) {
    const blob = new Blob([`(${workerFunction.toString()})()`], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  // Performance budget monitoring
  static checkPerformanceBudget(metrics) {
    const budget = {
      maxBundleSize: 500, // KB
      maxLoadTime: 3000, // ms
      maxMemoryUsage: 50 // MB
    };

    const violations = [];

    if (metrics.resources && metrics.resources.totalSize > budget.maxBundleSize * 1024) {
      violations.push(`Bundle size exceeds budget: ${Math.round(metrics.resources.totalSize / 1024)}KB`);
    }

    if (metrics.navigation && metrics.navigation.loadComplete > budget.maxLoadTime) {
      violations.push(`Load time exceeds budget: ${metrics.navigation.loadComplete}ms`);
    }

    if (metrics.memory && metrics.memory.used > budget.maxMemoryUsage) {
      violations.push(`Memory usage exceeds budget: ${metrics.memory.used}MB`);
    }

    return {
      withinBudget: violations.length === 0,
      violations
    };
  }

  // Automatic performance monitoring
  static startPerformanceMonitoring() {
    // Monitor memory usage
    setInterval(() => {
      const memory = this.monitorMemory();
      if (memory && memory.used > 100) { // 100MB threshold
        console.warn('High memory usage detected:', memory);
      }
    }, 30000); // Check every 30 seconds

    // Log performance metrics periodically
    setInterval(() => {
      const metrics = this.collectMetrics();
      console.log('Performance Metrics:', metrics);
    }, 60000); // Log every minute
  }

  // Cache management
  static createCacheManager() {
    const cache = new Map();
    const maxSize = 100;

    return {
      get: (key) => cache.get(key),
      set: (key, value) => {
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, value);
      },
      clear: () => cache.clear(),
      size: () => cache.size
    };
  }

  // Request deduplication
  static createRequestDeduplicator() {
    const pendingRequests = new Map();

    return async (key, requestFn) => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }

      const promise = requestFn().finally(() => {
        pendingRequests.delete(key);
      });

      pendingRequests.set(key, promise);
      return promise;
    };
  }
}

// React performance hooks
export const usePerformance = () => {
  const [metrics, setMetrics] = React.useState(null);

  React.useEffect(() => {
    const collectMetrics = () => {
      const performanceMetrics = PerformanceService.collectMetrics();
      setMetrics(performanceMetrics);
    };

    collectMetrics();
    const interval = setInterval(collectMetrics, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return metrics;
};

export default PerformanceService;
