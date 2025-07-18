import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NewsItem, TranslationRequest, TranslationResponse } from '@/types/news';

/**
 * 使用Gemini API翻译推文新闻内容
 */
export async function translateTweetsWithGemini(
  newsItems: NewsItem[], 
  apiKey: string
): Promise<NewsItem[]> {
  try {
    console.log(`🌐 Translating ${newsItems.length} tweet news items with Gemini...`);
    
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
 * 翻译一批推文新闻
 */
async function translateBatch(
  model: any, 
  newsItems: NewsItem[], 
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
      ...item,
      titleChinese: translation?.titleChinese || item.title,
      contentChinese: translation?.contentChinese || item.content,
    };
  });
  
  return translatedItems;
}

/**
 * 构建翻译提示（适配推文格式）
 */
function buildTranslationPrompt(newsItems: NewsItem[]): string {
  const newsTexts = newsItems.map((item, index) => {
    return `推文${index + 1}:
标题: ${item.title}
内容: ${item.content}`;
  }).join('\n\n');
  
  return `请将以下商业推文的标题和内容翻译成中文。要求：
1. 翻译要准确、自然、符合中文表达习惯
2. 保持原文的专业性和语调
3. 商业和金融术语要准确翻译
4. 保持推文的简洁性，避免过度修饰
5. 请按照指定的JSON格式返回结果

${newsTexts}

请严格按照以下JSON格式返回翻译结果：
{
  "translations": [
    {
      "titleChinese": "翻译后的标题1",
      "contentChinese": "翻译后的内容1"
    },
    {
      "titleChinese": "翻译后的标题2", 
      "contentChinese": "翻译后的内容2"
    }
  ]
}

注意：请确保返回的JSON格式正确，translations数组的长度应该与输入的推文数量一致。`;
}

/**
 * 解析翻译响应
 */
function parseTranslationResponse(
  responseText: string, 
  expectedCount: number
): Array<{titleChinese: string; contentChinese: string}> {
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
        contentChinese: item.contentChinese || `翻译失败的内容 ${index + 1}`,
      }));
    }
    
    throw new Error('Invalid response format');
    
  } catch (error) {
    console.error('❌ Error parsing translation response:', error);
    console.log('Response text:', responseText);
    
    // 返回备用翻译
    return Array.from({ length: expectedCount }, (_, index) => ({
      titleChinese: `商业推文标题 ${index + 1}`,
      contentChinese: `商业推文内容 ${index + 1}`,
    }));
  }
}

/**
 * 创建备用新闻项（未翻译版本）
 */
function createFallbackNewsItem(item: NewsItem, index: number): NewsItem {
  return {
    ...item,
    titleChinese: `[英文] ${item.title}`,
    contentChinese: `[英文] ${item.content}`,
  };
}

/**
 * 单独翻译单条新闻（用于更新现有新闻）
 */
export async function translateSingleNews(
  newsItem: NewsItem, 
  apiKey: string
): Promise<NewsItem> {
  try {
    const translated = await translateTweetsWithGemini([newsItem], apiKey);
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
    !item.titleChinese || !item.contentChinese
  );
  
  if (itemsNeedingTranslation.length === 0) {
    return newsItems; // 所有项目都已翻译
  }
  
  console.log(`🔄 Filling missing translations for ${itemsNeedingTranslation.length} items...`);
  
  try {
    const translatedItems = await translateTweetsWithGemini(itemsNeedingTranslation, apiKey);
    
    // 合并翻译结果
    const updatedItems = newsItems.map(item => {
      if (!item.titleChinese || !item.contentChinese) {
        const translated = translatedItems.find(t => t.id === item.id);
        if (translated) {
          return {
            ...item,
            titleChinese: translated.titleChinese,
            contentChinese: translated.contentChinese,
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