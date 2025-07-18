"use server";

import type { MarketData } from "@/types/market";
import { getDocClient } from "@/lib/dynamodb";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";
import { analyzeMarketData, analyzeMarketDataWith15MinAggregation } from "@/ai/flows/analyze-market-flow";
import { fetchBBCBusinessNews, validateNewsItem, cleanNewsItem } from "@/lib/news-scraper";
import { translateNewsWithGemini, validateGeminiApiKey } from "@/lib/news-translator";
import { getNewsWithCache, forceRefreshCache } from "@/lib/news-cache";
import type { NewsResponse, NewsItem } from "@/types/news";

const MARKET_DATA_TABLE_PREFIX = "market_ohlcv";


async function fetchMarketDataForTimeframe(
  symbol: string,
  timeframe: "3min" | "1hour",
  limit: number = 50
): Promise<MarketData[]> {
  const docClient = getDocClient();
  if (!docClient) throw new Error("DynamoDB client not available");

  const tableName = `${MARKET_DATA_TABLE_PREFIX}_${timeframe}`;
  const upperSymbol = symbol.toUpperCase();

  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "symbol = :s",
    ExpressionAttributeValues: {
      ":s": upperSymbol,
    },
    ScanIndexForward: false, //descending
    Limit: limit,
  });

  const { Items } = await docClient.send(command);
  // The data is fetched in descending order (newest first), so we need to reverse it for charting
  return ((Items || []) as MarketData[]).reverse();
}

export async function getMarketData(
  symbol: string,
): Promise<{ data1h?: MarketData[]; data3m?: MarketData[]; error?: string }> {
  const docClient = getDocClient();
  if (!docClient) {
    return { error: "AWS credentials are not configured correctly. Please check your environment variables." };
  }

  try {
    const [data1h, data3m] = await Promise.all([
      fetchMarketDataForTimeframe(symbol, "1hour", 50),
      fetchMarketDataForTimeframe(symbol, "3min", 200),
    ]);
    
    if (data1h.length === 0 && data3m.length === 0) {
      return { error: `No data found for symbol "${symbol}" in any timeframe.` };
    }
    
    revalidatePath('/');
    return { data1h, data3m };
  } catch (err) {
    console.error("DynamoDB query error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { error: `Failed to fetch data from DynamoDB. ${errorMessage}` };
  }
}

export async function getAllSymbols(): Promise<{ symbols?: string[]; error?: string }> {
  const docClient = getDocClient();
  if (!docClient) {
    return { error: "AWS credentials are not configured correctly." };
  }
  try {
    const command = new ScanCommand({
      TableName: `${MARKET_DATA_TABLE_PREFIX}_1hour`,
      ProjectionExpression: "symbol",
    });

    const { Items } = await docClient.send(command);
    if (!Items) {
      return { symbols: [] };
    }

    const uniqueSymbols = [...new Set(Items.map(item => item.symbol))].sort();
    
    revalidatePath('/');
    return { symbols: uniqueSymbols };
  } catch (err) {
    console.error("DynamoDB scan error:", err);
    return { error: "Failed to fetch symbols from DynamoDB." };
  }
}

export async function analyzeMarketSentiment(data: MarketData[], apiKey: string): Promise<{ analysis?: string; error?: string }> {
    if (!apiKey) {
        return { error: "Gemini API key is missing. Please set it in the configuration before running analysis." };
    }

    try {
        const result = await analyzeMarketData({ marketData: data }, apiKey);
        revalidatePath('/');
        return { analysis: result };
    } catch (error: any) {
        console.error("Error during market analysis:", error);
        
        const fullErrorString = error.message || JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        
        // Restore user-friendly error message for common API key issues.
        if (fullErrorString.includes('API key not valid') || fullErrorString.includes('permission_denied') || fullErrorString.includes('PERMISSION_DENIED') || fullErrorString.includes('API key is invalid')) {
            return { error: "您提供的 Gemini API 密钥无效或格式不正确，请检查后重试。" };
        }

        // For all other errors, return the full details for debugging.
        return { error: `AI analysis failed: \n${fullErrorString}` };
    }
}

export async function analyzeMarketSentimentWith15MinAggregation(data: MarketData[], apiKey: string): Promise<{ analysis?: string; error?: string }> {
    if (!apiKey) {
        return { error: "Gemini API key is missing. Please set it in the configuration before running analysis." };
    }

    try {
        const result = await analyzeMarketDataWith15MinAggregation({ marketData: data }, apiKey);
        revalidatePath('/');
        return { analysis: result };
    } catch (error: any) {
        console.error("Error during 15-min aggregated market analysis:", error);
        
        const fullErrorString = error.message || JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        
        // Restore user-friendly error message for common API key issues.
        if (fullErrorString.includes('API key not valid') || fullErrorString.includes('permission_denied') || fullErrorString.includes('PERMISSION_DENIED') || fullErrorString.includes('API key is invalid')) {
            return { error: "您提供的 Gemini API 密钥无效或格式不正确，请检查后重试。" };
        }

        // For all other errors, return the full details for debugging.
        return { error: `AI analysis failed: \n${fullErrorString}` };
    }
}

// ======================== NEWS ACTIONS ========================

/**
 * 获取BBC商业新闻（带缓存的智能策略）
 */
export async function getBBCNews(): Promise<NewsResponse> {
    try {
        console.log('🗞️ Getting BBC news with cache strategy...');
        
        const result = await getNewsWithCache(async () => {
            // 获取原始BBC新闻
            const rawNews = await fetchBBCBusinessNews();
            
            // 验证和清理数据
            const validNews = rawNews
                .filter(validateNewsItem)
                .map(cleanNewsItem);
            
            console.log(`✅ Fetched and validated ${validNews.length} BBC news items`);
            
            // 检查是否有可用的API密钥进行翻译
            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey) {
                console.log('🌐 Auto-translating news with server API key...');
                try {
                    return await translateNewsWithGemini(validNews, apiKey);
                } catch (error) {
                    console.warn('⚠️ Auto-translation failed, returning English news:', error);
                    // 如果翻译失败，返回英文版本
                    return validNews.map((item, index) => ({
                        id: `bbc-${Date.now()}-${index}`,
                        title: item.title,
                        titleChinese: undefined,
                        summary: item.summary || item.title,
                        summaryChinese: undefined,
                        url: item.url,
                        publishedAt: item.publishedAt,
                        imageUrl: item.imageUrl,
                        category: 'business' as const,
                    }));
                }
            } else {
                // 没有服务器端API密钥，返回英文版本
                return validNews.map((item, index) => ({
                    id: `bbc-${Date.now()}-${index}`,
                    title: item.title,
                    titleChinese: undefined,
                    summary: item.summary || item.title,
                    summaryChinese: undefined,
                    url: item.url,
                    publishedAt: item.publishedAt,
                    imageUrl: item.imageUrl,
                    category: 'business' as const,
                }));
            }
        });
        
        revalidatePath('/');
        return {
            news: result.news,
            status: result.status,
            lastUpdated: result.lastUpdated?.toISOString(),
        };
        
    } catch (error: any) {
        console.error('❌ Error getting BBC news:', error);
        return {
            error: `Failed to fetch news: ${error.message}`,
            status: 'error',
        };
    }
}

/**
 * 翻译已有的新闻内容
 */
export async function translateNews(news: NewsItem[], apiKey: string): Promise<{ news?: NewsItem[]; error?: string }> {
    if (!apiKey) {
        return { error: "需要提供 Gemini API 密钥才能进行翻译。" };
    }
    
    try {
        console.log(`🌐 Translating ${news.length} news items...`);
        
        // 验证API密钥
        const isValidKey = await validateGeminiApiKey(apiKey);
        if (!isValidKey) {
            return { error: "提供的 Gemini API 密钥无效，请检查后重试。" };
        }
        
        // 转换为BBCRawNews格式
        const rawNews = news.map(item => ({
            title: item.title,
            summary: item.summary,
            url: item.url,
            publishedAt: item.publishedAt,
            imageUrl: item.imageUrl,
        }));
        
        const translatedNews = await translateNewsWithGemini(rawNews, apiKey);
        
        revalidatePath('/');
        return { news: translatedNews };
        
    } catch (error: any) {
        console.error('❌ Error translating news:', error);
        
        const fullErrorString = error.message || JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        
        if (fullErrorString.includes('API key not valid') || fullErrorString.includes('permission_denied') || fullErrorString.includes('PERMISSION_DENIED') || fullErrorString.includes('API key is invalid')) {
            return { error: "您提供的 Gemini API 密钥无效或格式不正确，请检查后重试。" };
        }
        
        return { error: `翻译失败: ${fullErrorString}` };
    }
}

/**
 * 强制刷新新闻缓存
 */
export async function refreshNewsCache(): Promise<NewsResponse> {
    try {
        console.log('🔄 Force refreshing news cache...');
        
        const news = await forceRefreshCache(async () => {
            const rawNews = await fetchBBCBusinessNews();
            const validNews = rawNews
                .filter(validateNewsItem)
                .map(cleanNewsItem);
            
            // 返回英文版本，让前端决定是否翻译
            return validNews.map((item, index) => ({
                id: `bbc-fresh-${Date.now()}-${index}`,
                title: item.title,
                titleChinese: undefined,
                summary: item.summary || item.title,
                summaryChinese: undefined,
                url: item.url,
                publishedAt: item.publishedAt,
                imageUrl: item.imageUrl,
                category: 'business' as const,
            }));
        });
        
        revalidatePath('/');
        return {
            news,
            status: 'fresh',
            lastUpdated: new Date().toISOString(),
        };
        
    } catch (error: any) {
        console.error('❌ Error refreshing news cache:', error);
        return {
            error: `刷新新闻失败: ${error.message}`,
            status: 'error',
        };
    }
}

/**
 * 验证Gemini API密钥
 */
export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const isValid = await validateGeminiApiKey(apiKey);
        return { valid: isValid };
    } catch (error: any) {
        console.error('❌ Error validating API key:', error);
        return { 
            valid: false, 
            error: error.message || 'API密钥验证失败' 
        };
    }
}
