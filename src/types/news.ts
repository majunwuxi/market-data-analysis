import { z } from 'zod';

// Tweets数据表的原始数据结构
export const TweetRawDataSchema = z.object({
  created_at: z.string(),
  content: z.string(),
  original_links: z.string().optional(),
});

export type TweetRawData = z.infer<typeof TweetRawDataSchema>;

// 新闻项的数据结构（适配Twitter数据）
export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(), // 从content提取的标题（前50个字符）
  titleChinese: z.string().optional(),
  content: z.string(), // 完整的推文内容
  contentChinese: z.string().optional(),
  url: z.string().optional(), // original_links字段
  publishedAt: z.string(), // created_at字段
  category: z.string().optional(),
  source: z.literal('tweets').default('tweets'), // 标识数据来源
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

// 缓存数据结构
export interface NewsCacheData {
  news: NewsItem[];
  lastUpdated: number;
  isUpdating: boolean;
  error?: string;
}

// 新闻获取状态
export type NewsStatus = 'loading' | 'cached' | 'fresh' | 'error' | 'translating';

// 新闻API返回类型
export interface NewsResponse {
  news?: NewsItem[];
  error?: string;
  status: NewsStatus;
  lastUpdated?: string;
}

// 翻译请求结构（适配Twitter内容）
export interface TranslationRequest {
  tweets: {
    title: string;
    content: string;
  }[];
}

// 翻译响应结构
export interface TranslationResponse {
  translations: {
    titleChinese: string;
    contentChinese: string;
  }[];
  error?: string;
} 