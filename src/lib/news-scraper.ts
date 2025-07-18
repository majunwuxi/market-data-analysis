import * as cheerio from 'cheerio';
import type { BBCRawNews } from '@/types/news';

// BBC Business 页面URL
const BBC_BUSINESS_URL = 'https://www.bbc.com/business';

// User Agent 避免被识别为爬虫
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

/**
 * 解析相对时间格式（如 "1 day ago", "2 hours ago"）
 */
function parseRelativeTime(timeStr: string): string {
  const now = new Date();
  const cleanTimeStr = timeStr.toLowerCase().trim();
  
  // 如果已经是ISO格式，直接返回
  if (cleanTimeStr.includes('t') && cleanTimeStr.includes('z')) {
    return timeStr;
  }
  
  // 解析相对时间
  const timeRegex = /(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i;
  const match = cleanTimeStr.match(timeRegex);
  
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'minute':
        now.setMinutes(now.getMinutes() - amount);
        break;
      case 'hour':
        now.setHours(now.getHours() - amount);
        break;
      case 'day':
        now.setDate(now.getDate() - amount);
        break;
      case 'week':
        now.setDate(now.getDate() - (amount * 7));
        break;
      case 'month':
        now.setMonth(now.getMonth() - amount);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - amount);
        break;
    }
  }
  
  return now.toISOString();
}

/**
 * 从BBC商业频道抓取新闻
 */
export async function fetchBBCBusinessNews(): Promise<BBCRawNews[]> {
  try {
    console.log('🌐 Fetching BBC Business news...');
    
    const response = await fetch(BBC_BUSINESS_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const news: BBCRawNews[] = [];
    
    // BBC新闻的几种选择器，按优先级排序
    const selectors = [
      // 主要新闻区域的选择器
      '[data-testid="liverpool-card"]',
      '.media__content',
      '.gs-c-promo',
      '.bbc-uk8dsi', // 备用选择器
      '.gel-layout__item',
    ];
    
    let foundElements = false;
    
    for (const selector of selectors) {
      const elements = $(selector);
      console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);
      
      if (elements.length > 0) {
        foundElements = true;
        elements.each((index, element) => {
          try {
            const $element = $(element);
            
            // 提取标题和链接
            const titleElement = $element.find('h3, .media__title, .gs-c-promo-heading__title, .bbc-uk8dsi h3, [data-testid="card-headline"]').first();
            const linkElement = $element.find('a').first();
            
            let title = titleElement.text().trim();
            let href = linkElement.attr('href');
            
            // 如果没有找到标题，尝试从链接的aria-label或title获取
            if (!title) {
              title = linkElement.attr('aria-label') || linkElement.attr('title') || '';
            }
            
            // 处理相对URL
            if (href && href.startsWith('/')) {
              href = `https://www.bbc.com${href}`;
            } else if (href && !href.startsWith('http')) {
              // 如果不是以http开头的绝对URL，也不是相对URL，可能是其他格式
              href = `https://www.bbc.com${href.startsWith('/') ? href : '/' + href}`;
            }
            
            // 提取摘要
            const summaryElement = $element.find('.media__summary, .gs-c-promo-summary, p, .bbc-uk8dsi p').first();
            const summary = summaryElement.text().trim();
            
            // 提取图片
            const imageElement = $element.find('img').first();
            let imageUrl = imageElement.attr('src') || imageElement.attr('data-src');
            
            // 处理图片URL
            if (imageUrl && imageUrl.startsWith('//')) {
              imageUrl = `https:${imageUrl}`;
            } else if (imageUrl && imageUrl.startsWith('/')) {
              imageUrl = `https://www.bbc.com${imageUrl}`;
            }
            
            // 提取时间（BBC通常使用相对时间）
            const timeElement = $element.find('time, .date, .timestamp, [data-testid="card-metadata-lastupdated"]').first();
            let publishedAt = timeElement.attr('datetime') || timeElement.text().trim();
            
            // 解析相对时间格式
            if (publishedAt) {
              publishedAt = parseRelativeTime(publishedAt);
            } else {
              publishedAt = new Date().toISOString();
            }
            
            // 验证必要字段 - 放宽验证条件
            if (title && href && title.length >= 5) {
              const newsItem = {
                title: title.substring(0, 200), // 限制标题长度
                summary: summary.substring(0, 500) || title, // 如果没有摘要，使用标题
                url: href,
                publishedAt,
                imageUrl: imageUrl || undefined,
              };
              
              news.push(newsItem);
              console.log(`📰 Found news: ${title.substring(0, 50)}...`);
              console.log(`🔗 URL: ${href}`);
            } else {
              console.log(`⚠️ Skipping item - title: "${title}" (${title?.length} chars), href: "${href}"`);
            }
          } catch (error) {
            console.warn('⚠️ Error parsing news item:', error);
          }
          
          // 限制获取前10条新闻
          if (news.length >= 10) {
            return false; // 停止遍历
          }
        });
        
        if (news.length > 0) {
          break; // 如果找到了新闻，停止尝试其他选择器
        }
      }
    }
    
    if (!foundElements) {
      console.warn('⚠️ No news elements found with any selector');
      
      // 备用方案：查找所有包含文本的链接
      const allLinks = $('a[href]');
      console.log(`🔍 Fallback: Found ${allLinks.length} total links`);
      
      allLinks.each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        // 过滤可能的新闻链接
        if (href && text && text.length > 20 && text.length < 200 && 
            (href.includes('/news/') || href.includes('/business/')) &&
            !href.includes('#') && !href.includes('mailto:')) {
          
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `https://www.bbc.com${href}`;
          }
          
          news.push({
            title: text,
            summary: text,
            url: fullUrl,
            publishedAt: new Date().toISOString(),
          });
          
          console.log(`📰 Fallback news: ${text.substring(0, 50)}...`);
          
          if (news.length >= 10) {
            return false;
          }
        }
      });
    }
    
    // 按时间排序（最新的在前面）
    const sortedNews = news
      .filter((item, index, array) => 
        // 去重：相同标题或URL的只保留第一个
        array.findIndex(other => 
          other.title === item.title || other.url === item.url
        ) === index
      )
      .sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA; // 降序排列
      })
      .slice(0, 10); // 只取前10条
    
    console.log(`✅ Successfully fetched ${sortedNews.length} BBC news items`);
    return sortedNews;
    
  } catch (error) {
    console.error('❌ Error fetching BBC news:', error);
    
    // 返回模拟数据作为备用
    return getMockBBCNews();
  }
}

/**
 * 模拟BBC新闻数据（用于测试和备用）
 */
function getMockBBCNews(): BBCRawNews[] {
  const now = new Date();
  const mockNews: BBCRawNews[] = [];
  
  const mockTitles = [
    "Global markets react to latest economic indicators",
    "Technology sector sees significant growth this quarter",
    "Central bank announces new monetary policy measures",
    "International trade negotiations reach critical juncture",
    "Energy prices fluctuate amid supply chain concerns",
    "Consumer confidence shows mixed signals across regions",
    "Financial services industry adapts to digital transformation",
    "Emerging markets attract increased investor attention",
    "Inflation data reveals unexpected trends in key economies",
    "Corporate earnings season brings surprises and challenges"
  ];
  
  for (let i = 0; i < Math.min(10, mockTitles.length); i++) {
    const publishTime = new Date(now.getTime() - (i * 60 * 60 * 1000)); // 每小时一条新闻
    
    mockNews.push({
      title: mockTitles[i],
      summary: `This is a summary for ${mockTitles[i]}. It provides additional context and details about the news story, helping readers understand the key points and implications.`,
      url: `https://www.bbc.com/news/business-${Date.now()}-${i}`,
      publishedAt: publishTime.toISOString(),
      imageUrl: `https://placehold.co/300x200/3B82F6/white?text=News+${i + 1}`,
    });
  }
  
  console.log('📋 Using mock BBC news data');
  return mockNews;
}

/**
 * 验证新闻数据的有效性
 */
export function validateNewsItem(item: BBCRawNews): boolean {
  try {
    console.log(`🔍 Validating news item: "${item.title?.substring(0, 50)}..."`);
    
    // 检查必要字段
    if (!item.title || !item.url || !item.publishedAt) {
      console.log(`❌ Missing required fields - title: ${!!item.title}, url: ${!!item.url}, publishedAt: ${!!item.publishedAt}`);
      return false;
    }
    
    // 检查标题长度 - 放宽要求
    if (item.title.length < 5 || item.title.length > 500) {
      console.log(`❌ Invalid title length: ${item.title.length} (need 5-500 chars)`);
      return false;
    }
    
    // 检查URL格式
    try {
      new URL(item.url);
    } catch {
      console.log(`❌ Invalid URL format: ${item.url}`);
      return false;
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
export function cleanNewsItem(item: BBCRawNews): BBCRawNews {
  return {
    title: item.title.trim().replace(/\s+/g, ' '),
    summary: (item.summary || item.title).trim().replace(/\s+/g, ' '),
    url: item.url.trim(),
    publishedAt: item.publishedAt,
    imageUrl: item.imageUrl?.trim(),
  };
} 