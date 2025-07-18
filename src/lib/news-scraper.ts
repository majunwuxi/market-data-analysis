import type { NewsItem } from '@/types/news';
import { fetchLatestNews, getMockTweetNews } from './tweets-service';

/**
 * 从DynamoDB Tweets表获取最新商业资讯
 */
export async function fetchBusinessNews(): Promise<NewsItem[]> {
  try {
    console.log('🐦 Fetching business news from Tweets table...');
    
    const newsItems = await fetchLatestNews(10);
    
    if (newsItems.length === 0) {
      console.log('⚠️ No tweets found, falling back to mock data');
      return getMockTweetNews();
    }
    
    console.log(`✅ Successfully fetched ${newsItems.length} business news items from Tweets`);
    return newsItems;
    
  } catch (error) {
    console.error('❌ Error fetching business news from Tweets table:', error);
    
    // 返回模拟数据作为备用
    console.log('🔄 Falling back to mock tweet data');
    return getMockTweetNews();
  }
}

/**
 * 验证新闻数据的有效性
 */
export function validateNewsItem(item: NewsItem): boolean {
  try {
    console.log(`🔍 Validating news item: "${item.title?.substring(0, 50)}..."`);
    
    // 检查必要字段
    if (!item.title || !item.content || !item.publishedAt) {
      console.log(`❌ Missing required fields - title: ${!!item.title}, content: ${!!item.content}, publishedAt: ${!!item.publishedAt}`);
      return false;
    }
    
    // 检查标题长度
    if (item.title.length < 5 || item.title.length > 200) {
      console.log(`❌ Invalid title length: ${item.title.length} (need 5-200 chars)`);
      return false;
    }
    
    // 检查内容长度
    if (item.content.length < 10 || item.content.length > 2000) {
      console.log(`❌ Invalid content length: ${item.content.length} (need 10-2000 chars)`);
      return false;
    }
    
    // 检查URL格式（如果存在）
    if (item.url) {
      try {
        new URL(item.url);
      } catch {
        console.log(`❌ Invalid URL format: ${item.url}`);
        return false;
      }
    }
    
    // 检查时间格式
    if (isNaN(new Date(item.publishedAt).getTime())) {
      console.log(`❌ Invalid date format: ${item.publishedAt}`);
      return false;
    }
    
    console.log(`✅ News item validated successfully`);
    return true;
  } catch (error) {
    console.log(`❌ Validation error:`, error);
    return false;
  }
}

/**
 * 清理和标准化新闻数据
 */
export function cleanNewsItem(item: NewsItem): NewsItem {
  return {
    ...item,
    title: item.title.trim().replace(/\s+/g, ' '),
    content: item.content.trim().replace(/\s+/g, ' '),
    titleChinese: item.titleChinese?.trim().replace(/\s+/g, ' '),
    contentChinese: item.contentChinese?.trim().replace(/\s+/g, ' '),
    url: item.url?.trim(),
  };
}

/**
 * 格式化新闻数据用于显示
 */
export function formatNewsForDisplay(items: NewsItem[]): NewsItem[] {
  return items
    .filter(validateNewsItem)
    .map(cleanNewsItem)
    .sort((a, b) => {
      // 按时间降序排序（最新的在前）
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });
}

/**
 * 检查新闻项是否已翻译
 */
export function isNewsItemTranslated(item: NewsItem): boolean {
  return !!(item.titleChinese && item.contentChinese);
}

/**
 * 获取新闻摘要（用于显示预览）
 */
export function getNewsSummary(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // 在单词边界处截断
  const truncated = content.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength * 0.7) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

/**
 * 从内容中提取关键标签
 */
export function extractTags(content: string): string[] {
  const tags: string[] = [];
  
  // 提取可能的股票代码 ($AAPL, $GOOGL等)
  const stockSymbols = content.match(/\$[A-Z]{1,5}/g);
  if (stockSymbols) {
    tags.push(...stockSymbols);
  }
  
  // 提取话题标签 (#hashtag)
  const hashtags = content.match(/#[a-zA-Z0-9_]+/g);
  if (hashtags) {
    tags.push(...hashtags);
  }
  
  // 提取常见金融关键词
  const financialKeywords = [
    'market', 'stock', 'trading', 'investment', 'crypto', 'bitcoin',
    'earnings', 'revenue', 'profit', 'economy', 'inflation', 'rate',
    'IPO', 'merger', 'acquisition', 'dividend'
  ];
  
  const lowerContent = content.toLowerCase();
  financialKeywords.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  // 去重并限制数量
  return [...new Set(tags)].slice(0, 5);
} 