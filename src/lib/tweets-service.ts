import { getDocClient } from "@/lib/dynamodb";
import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { TweetRawData, NewsItem } from "@/types/news";

const TWEETS_TABLE_NAME = "Tweets";

/**
 * 从DynamoDB Tweets表获取最新的推文数据
 */
export async function fetchLatestTweets(limit: number = 10): Promise<TweetRawData[]> {
  const docClient = getDocClient();
  if (!docClient) {
    throw new Error("DynamoDB client not available. Please check AWS credentials.");
  }

  try {
    console.log(`🐦 Fetching latest ${limit} tweets from DynamoDB...`);
    
    // 使用Scan操作获取所有数据，然后在客户端排序
    // 注意：如果数据量大，建议添加GSI（全局二级索引）来优化查询
    const command = new ScanCommand({
      TableName: TWEETS_TABLE_NAME,
      ProjectionExpression: "created_at, content, original_links",
    });

    const { Items } = await docClient.send(command);
    
    if (!Items || Items.length === 0) {
      console.log("⚠️ No tweets found in DynamoDB table");
      return [];
    }

    // 验证和清理数据
    const validTweets = Items
      .filter(validateTweetData)
      .map(cleanTweetData)
      .sort((a, b) => {
        // 按时间降序排序（最新的在前）
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      })
      .slice(0, limit); // 取前N条

    console.log(`✅ Successfully fetched ${validTweets.length} valid tweets`);
    return validTweets;

  } catch (error) {
    console.error("❌ Error fetching tweets from DynamoDB:", error);
    throw new Error(`Failed to fetch tweets: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 验证推文数据的有效性
 */
function validateTweetData(item: any): boolean {
  try {
    // 检查必要字段
    if (!item.created_at || !item.content) {
      console.log(`❌ Invalid tweet data - missing required fields: created_at=${!!item.created_at}, content=${!!item.content}`);
      return false;
    }

    // 检查内容长度
    if (typeof item.content !== 'string' || item.content.trim().length < 10) {
      console.log(`❌ Invalid tweet content length: ${item.content?.length || 0}`);
      return false;
    }

    // 检查时间格式
    const parsedDate = new Date(item.created_at);
    if (isNaN(parsedDate.getTime())) {
      console.log(`❌ Invalid date format: ${item.created_at}`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`❌ Error validating tweet data:`, error);
    return false;
  }
}

/**
 * 清理和标准化推文数据
 */
function cleanTweetData(item: any): TweetRawData {
  return {
    created_at: item.created_at.trim(),
    content: item.content.trim().replace(/\s+/g, ' '), // 标准化空白字符
    original_links: item.original_links?.trim() || undefined,
  };
}

/**
 * 将推文数据转换为新闻项格式
 */
export function convertTweetsToNewsItems(tweets: TweetRawData[]): NewsItem[] {
  return tweets.map((tweet, index) => {
    // 生成标题：取内容的前50个字符，去除换行符
    const title = tweet.content
      .replace(/\n/g, ' ')
      .substring(0, 50)
      .trim() + (tweet.content.length > 50 ? '...' : '');

    // 生成唯一ID
    const id = `tweet-${new Date(tweet.created_at).getTime()}-${index}`;

    return {
      id,
      title,
      titleChinese: undefined,
      content: tweet.content,
      contentChinese: undefined,
      url: tweet.original_links,
      publishedAt: tweet.created_at,
      category: 'business',
      source: 'tweets' as const,
    };
  });
}

/**
 * 获取并转换推文为新闻格式
 */
export async function fetchLatestNews(limit: number = 10): Promise<NewsItem[]> {
  try {
    const tweets = await fetchLatestTweets(limit);
    const newsItems = convertTweetsToNewsItems(tweets);
    
    console.log(`🔄 Converted ${tweets.length} tweets to ${newsItems.length} news items`);
    return newsItems;
    
  } catch (error) {
    console.error("❌ Error fetching latest news:", error);
    throw error;
  }
}

/**
 * 获取模拟推文数据（用于测试和备用）
 */
export function getMockTweetNews(): NewsItem[] {
  const now = new Date();
  const mockTweets: NewsItem[] = [];
  
  const mockContents = [
    "Market volatility continues as investors react to latest economic indicators. Key sectors showing mixed signals across global exchanges.",
    "Breaking: Central bank announces new monetary policy framework. Interest rate decisions expected to impact financial markets significantly.",
    "Technology stocks surge on positive earnings reports. AI and cloud computing sectors leading the charge in today's trading session.",
    "Cryptocurrency market shows resilience despite regulatory concerns. Bitcoin and major altcoins maintaining steady growth patterns.",
    "Global supply chain disruptions affecting commodity prices. Energy and agricultural sectors experiencing significant price movements.",
    "Financial institutions report strong quarterly results. Banking sector confidence rises amid improved economic outlook.",
    "International trade negotiations progress as countries seek new economic partnerships. Market sentiment remains cautiously optimistic.",
    "Consumer spending data reveals changing patterns in post-pandemic economy. Retail and service sectors adapting to new trends.",
    "Climate change concerns drive investment in green technologies. Sustainable finance initiatives gaining momentum globally.",
    "Emerging markets attract renewed investor interest. Developing economies showing promising growth potential."
  ];
  
  for (let i = 0; i < Math.min(10, mockContents.length); i++) {
    const publishTime = new Date(now.getTime() - (i * 30 * 60 * 1000)); // 每30分钟一条
    
    mockTweets.push({
      id: `mock-tweet-${Date.now()}-${i}`,
      title: mockContents[i].substring(0, 50) + '...',
      titleChinese: undefined,
      content: mockContents[i],
      contentChinese: undefined,
      url: `https://twitter.com/mock/status/${Date.now()}-${i}`,
      publishedAt: publishTime.toISOString(),
      category: 'business',
      source: 'tweets',
    });
  }
  
  console.log('📋 Using mock tweet news data');
  return mockTweets;
} 