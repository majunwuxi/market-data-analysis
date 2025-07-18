import type { NewsItem, NewsCacheData, NewsStatus } from '@/types/news';

// 缓存配置
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟
const MAX_CACHE_AGE = 4 * 60 * 60 * 1000; // 4小时最大缓存时间

// 内存缓存
let newsCache: NewsCacheData | null = null;

// 正在进行的更新Promise，防止重复请求
let updatePromise: Promise<NewsItem[]> | null = null;

/**
 * 获取缓存的新闻数据
 */
export function getCachedNews(): NewsItem[] | null {
  if (!newsCache) return null;
  return newsCache.news;
}

/**
 * 检查缓存是否有效
 */
export function isCacheValid(): boolean {
  if (!newsCache) return false;
  const now = Date.now();
  return (now - newsCache.lastUpdated) < CACHE_DURATION;
}

/**
 * 检查缓存是否过期（超过最大缓存时间）
 */
export function isCacheExpired(): boolean {
  if (!newsCache) return true;
  const now = Date.now();
  return (now - newsCache.lastUpdated) > MAX_CACHE_AGE;
}

/**
 * 获取缓存状态
 */
export function getCacheStatus(): NewsStatus {
  if (!newsCache) return 'loading';
  if (newsCache.error) return 'error';
  if (newsCache.isUpdating) return 'translating';
  if (isCacheValid()) return 'cached';
  return 'fresh';
}

/**
 * 设置缓存数据
 */
export function setCacheData(news: NewsItem[], error?: string): void {
  const now = Date.now();
  
  if (!newsCache) {
    newsCache = {
      news: [],
      lastUpdated: 0,
      isUpdating: false,
    };
  }
  
  newsCache.news = news;
  newsCache.lastUpdated = now;
  newsCache.isUpdating = false;
  newsCache.error = error;
  
  console.log(`✅ News cache updated with ${news.length} items at ${new Date(now).toLocaleTimeString()}`);
}

/**
 * 标记缓存正在更新
 */
export function markCacheUpdating(): void {
  if (!newsCache) {
    newsCache = {
      news: [],
      lastUpdated: 0,
      isUpdating: true,
    };
  } else {
    newsCache.isUpdating = true;
  }
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  newsCache = null;
  updatePromise = null;
  console.log('🗑️ News cache cleared');
}

/**
 * 获取缓存的最后更新时间
 */
export function getLastUpdated(): Date | null {
  if (!newsCache) return null;
  return new Date(newsCache.lastUpdated);
}

/**
 * 智能缓存策略：获取新闻数据
 */
export async function getNewsWithCache(
  fetchFunction: () => Promise<NewsItem[]>
): Promise<{ news: NewsItem[]; status: NewsStatus; lastUpdated?: Date }> {
  const now = Date.now();
  
  // 如果有有效缓存，直接返回
  if (isCacheValid() && newsCache) {
    console.log('📋 Returning cached news data');
    return {
      news: newsCache.news,
      status: 'cached',
      lastUpdated: new Date(newsCache.lastUpdated),
    };
  }
  
  // 如果正在更新且有旧数据，返回旧数据
  if (newsCache?.isUpdating && newsCache.news.length > 0) {
    console.log('🔄 Update in progress, returning cached data');
    return {
      news: newsCache.news,
      status: 'translating',
      lastUpdated: new Date(newsCache.lastUpdated),
    };
  }
  
  // 如果已有更新Promise在进行，等待它完成
  if (updatePromise) {
    console.log('⏳ Waiting for ongoing update...');
    try {
      const news = await updatePromise;
      return {
        news,
        status: getCacheStatus(),
        lastUpdated: getLastUpdated() || undefined,
      };
    } catch (error) {
      console.error('❌ Update promise failed:', error);
      // 如果更新失败，返回旧缓存（如果有的话）
      if (newsCache && !isCacheExpired()) {
        return {
          news: newsCache.news,
          status: 'error',
          lastUpdated: new Date(newsCache.lastUpdated),
        };
      }
    }
  }
  
  // 开始新的更新
  console.log('🚀 Starting news update...');
  markCacheUpdating();
  
  updatePromise = (async () => {
    try {
      const news = await fetchFunction();
      setCacheData(news);
      return news;
    } catch (error) {
      console.error('❌ Failed to fetch news:', error);
      setCacheData(newsCache?.news || [], error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      updatePromise = null;
    }
  })();
  
  // 如果有旧数据且未完全过期，先返回旧数据
  if (newsCache && !isCacheExpired() && newsCache.news.length > 0) {
    // 异步更新，不等待
    updatePromise.catch(() => {
      // 静默处理错误，用户已经看到旧数据
    });
    
    return {
      news: newsCache.news,
      status: 'translating',
      lastUpdated: new Date(newsCache.lastUpdated),
    };
  }
  
  // 首次加载或缓存完全过期，等待更新完成
  try {
    const news = await updatePromise;
    return {
      news,
      status: 'fresh',
      lastUpdated: getLastUpdated() || undefined,
    };
  } catch (error) {
    return {
      news: [],
      status: 'error',
      lastUpdated: undefined,
    };
  }
}

/**
 * 异步更新缓存（不阻塞当前请求）
 */
export async function updateCacheAsync(fetchFunction: () => Promise<NewsItem[]>): Promise<void> {
  if (newsCache?.isUpdating || updatePromise) {
    console.log('🔄 Update already in progress, skipping...');
    return;
  }
  
  console.log('🔄 Starting async cache update...');
  markCacheUpdating();
  
  updatePromise = (async () => {
    try {
      const news = await fetchFunction();
      setCacheData(news);
      return news;
    } catch (error) {
      console.error('❌ Async update failed:', error);
      setCacheData(newsCache?.news || [], error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      updatePromise = null;
    }
  })();
  
  // 不等待结果，让更新在后台进行
  updatePromise.catch(() => {
    // 静默处理错误
  });
}

/**
 * 强制刷新缓存
 */
export async function forceRefreshCache(fetchFunction: () => Promise<NewsItem[]>): Promise<NewsItem[]> {
  console.log('🔄 Force refreshing cache...');
  clearCache();
  const result = await getNewsWithCache(fetchFunction);
  return result.news;
} 