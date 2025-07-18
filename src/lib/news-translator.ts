import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BBCRawNews, NewsItem, TranslationRequest, TranslationResponse } from '@/types/news';

/**
 * 使用Gemini API翻译新闻内容
 */
export async function translateNewsWithGemini(
  newsItems: BBCRawNews[], 
  apiKey: string
): Promise<NewsItem[]> {
  try {
    console.log(`🌐 Translating ${newsItems.length} news items with Gemini...`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const translatedNews: NewsItem[] = [];
    
    // 分批翻译，每批处理3条新闻
    const batchSize = 3;
    for (let i = 0; i < newsItems.length; i += batchSize) {
      const batch = newsItems.slice(i, i + batchSize);
      
      try {
        const batchTranslated = await translateBatch(model, batch, i);
        translatedNews.push(...batchTranslated);
        
        // 添加延迟避免API限制
        if (i + batchSize < newsItems.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Error translating batch ${i / batchSize + 1}:`, error);
        
        // 如果翻译失败，添加未翻译的版本
        const fallbackItems = batch.map(item => createFallbackNewsItem(item, i + batch.indexOf(item)));
        translatedNews.push(...fallbackItems);
      }
    }
    
    console.log(`✅ Translation completed: ${translatedNews.length} items`);
    return translatedNews;
    
  } catch (error) {
    console.error('❌ Error in translation process:', error);
    
    // 如果整个翻译过程失败，返回未翻译的版本
    return newsItems.map((item, index) => createFallbackNewsItem(item, index));
  }
}

/**
 * 翻译一批新闻
 */
async function translateBatch(
  model: any, 
  newsItems: BBCRawNews[], 
  startIndex: number
): Promise<NewsItem[]> {
  
  // 构建翻译提示
  const prompt = buildTranslationPrompt(newsItems);
  
  console.log(`🔄 Translating batch with ${newsItems.length} items...`);
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // 解析翻译结果
  const translations = parseTranslationResponse(text, newsItems.length);
  
  // 构建最终的新闻项
  const translatedItems: NewsItem[] = newsItems.map((item, index) => {
    const translation = translations[index];
    
    return {
      id: `bbc-${Date.now()}-${startIndex + index}`,
      title: item.title,
      titleChinese: translation?.titleChinese || item.title,
      summary: item.summary || item.title,
      summaryChinese: translation?.summaryChinese || item.summary || item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl,
      category: 'business',
    };
  });
  
  return translatedItems;
}

/**
 * 构建翻译提示
 */
function buildTranslationPrompt(newsItems: BBCRawNews[]): string {
  const newsTexts = newsItems.map((item, index) => {
    return `新闻${index + 1}:
标题: ${item.title}
摘要: ${item.summary || item.title}`;
  }).join('\n\n');
  
  return `请将以下BBC商业新闻的标题和摘要翻译成中文。要求：
1. 翻译要准确、自然、符合中文表达习惯
2. 保持原文的专业性和正式语调
3. 商业术语要准确翻译
4. 请按照指定的JSON格式返回结果

${newsTexts}

请严格按照以下JSON格式返回翻译结果：
{
  "translations": [
    {
      "titleChinese": "翻译后的标题1",
      "summaryChinese": "翻译后的摘要1"
    },
    {
      "titleChinese": "翻译后的标题2", 
      "summaryChinese": "翻译后的摘要2"
    }
  ]
}

注意：请确保返回的JSON格式正确，translations数组的长度应该与输入的新闻数量一致。`;
}

/**
 * 解析翻译响应
 */
function parseTranslationResponse(
  responseText: string, 
  expectedCount: number
): Array<{titleChinese: string; summaryChinese: string}> {
  try {
    // 清理响应文本
    let cleanedText = responseText.trim();
    
    // 移除可能的markdown代码块标记
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // 尝试解析JSON
    const parsed = JSON.parse(cleanedText);
    
    if (parsed.translations && Array.isArray(parsed.translations)) {
      // 确保数组长度正确
      const translations = parsed.translations.slice(0, expectedCount);
      
      // 验证每个翻译项
      return translations.map((item: any, index: number) => ({
        titleChinese: item.titleChinese || `翻译失败的标题 ${index + 1}`,
        summaryChinese: item.summaryChinese || `翻译失败的摘要 ${index + 1}`,
      }));
    }
    
    throw new Error('Invalid response format');
    
  } catch (error) {
    console.error('❌ Error parsing translation response:', error);
    console.log('Response text:', responseText);
    
    // 返回备用翻译
    return Array.from({ length: expectedCount }, (_, index) => ({
      titleChinese: `商业新闻标题 ${index + 1}`,
      summaryChinese: `商业新闻摘要 ${index + 1}`,
    }));
  }
}

/**
 * 创建备用新闻项（未翻译版本）
 */
function createFallbackNewsItem(item: BBCRawNews, index: number): NewsItem {
  return {
    id: `bbc-fallback-${Date.now()}-${index}`,
    title: item.title,
    titleChinese: `[英文] ${item.title}`,
    summary: item.summary || item.title,
    summaryChinese: `[英文] ${item.summary || item.title}`,
    url: item.url,
    publishedAt: item.publishedAt,
    imageUrl: item.imageUrl,
    category: 'business',
  };
}

/**
 * 单独翻译单条新闻（用于更新现有新闻）
 */
export async function translateSingleNews(
  newsItem: BBCRawNews, 
  apiKey: string
): Promise<NewsItem> {
  try {
    const translated = await translateNewsWithGemini([newsItem], apiKey);
    return translated[0];
  } catch (error) {
    console.error('❌ Error translating single news:', error);
    return createFallbackNewsItem(newsItem, 0);
  }
}

/**
 * 验证API密钥是否有效
 */
export async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // 发送一个简单的测试请求
    const result = await model.generateContent("Hello");
    const response = await result.response;
    const text = response.text();
    
    return Boolean(text && text.length > 0);
  } catch (error) {
    console.error('❌ API key validation failed:', error);
    return false;
  }
}

/**
 * 批量翻译现有新闻项的缺失翻译
 */
export async function fillMissingTranslations(
  newsItems: NewsItem[], 
  apiKey: string
): Promise<NewsItem[]> {
  const itemsNeedingTranslation = newsItems.filter(item => 
    !item.titleChinese || !item.summaryChinese
  );
  
  if (itemsNeedingTranslation.length === 0) {
    return newsItems; // 所有项目都已翻译
  }
  
  console.log(`🔄 Filling missing translations for ${itemsNeedingTranslation.length} items...`);
  
  try {
    // 转换为BBCRawNews格式进行翻译
    const rawNews: BBCRawNews[] = itemsNeedingTranslation.map(item => ({
      title: item.title,
      summary: item.summary,
      url: item.url,
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl,
    }));
    
    const translatedItems = await translateNewsWithGemini(rawNews, apiKey);
    
    // 合并翻译结果
    const updatedItems = newsItems.map(item => {
      if (!item.titleChinese || !item.summaryChinese) {
        const translated = translatedItems.find(t => t.url === item.url);
        if (translated) {
          return {
            ...item,
            titleChinese: translated.titleChinese,
            summaryChinese: translated.summaryChinese,
          };
        }
      }
      return item;
    });
    
    return updatedItems;
  } catch (error) {
    console.error('❌ Error filling missing translations:', error);
    return newsItems; // 返回原始数据
  }
} 