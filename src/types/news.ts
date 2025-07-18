import { z } from 'zod';

// 新闻项的数据结构
export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleChinese: z.string().optional(),
  summary: z.string(),
  summaryChinese: z.string().optional(),
  url: z.string().url(),
  publishedAt: z.string(),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
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

// BBC新闻原始数据结构
export interface BBCRawNews {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
}

// 翻译请求结构
export interface TranslationRequest {
  texts: {
    title: string;
    summary: string;
  }[];
}

// 翻译响应结构
export interface TranslationResponse {
  translations: {
    titleChinese: string;
    summaryChinese: string;
  }[];
  error?: string;
} 