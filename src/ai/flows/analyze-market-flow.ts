'use server';
/**
 * @fileOverview A market analysis function that works in serverless environment.
 *
 * - analyzeMarketData - A simple function that handles the market analysis process.
 * - analyzeMarketDataWith15MinAggregation - A function that aggregates 3min data to 15min before analysis.
 * - MarketAnalysisInput - The input type for the analyzeMarketData function.
 */

import { z } from 'zod';
import { MACD, RSI } from 'technicalindicators';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MarketDataSchema } from '@/types/market';
import type { MarketData } from '@/types/market';

const MarketAnalysisInputSchema = z.object({
  marketData: z.array(MarketDataSchema).describe('An array of the latest 200 OHLCV data points.'),
});
export type MarketAnalysisInput = z.infer<typeof MarketAnalysisInputSchema>;

/**
 * 将3分钟OHLCV数据聚合为15分钟OHLCV数据
 * @param data3min 3分钟K线数据数组（按时间升序排列）
 * @returns 15分钟K线数据数组
 */
function aggregateTo15Min(data3min: MarketData[]): MarketData[] {
  if (data3min.length === 0) return [];
  
  const result: MarketData[] = [];
  const symbol = data3min[0].symbol;
  
  // 按15分钟时间窗口分组（每5个3分钟K线聚合为1个15分钟K线）
  for (let i = 0; i < data3min.length; i += 5) {
    const group = data3min.slice(i, i + 5);
    if (group.length === 0) continue;
    
    // 聚合逻辑：
    // - 开盘价：使用组内第一根K线的开盘价
    // - 最高价：组内所有K线最高价的最大值
    // - 最低价：组内所有K线最低价的最小值
    // - 收盘价：使用组内最后一根K线的收盘价
    // - 成交量：组内所有K线成交量的总和
    // - 时间戳：使用组内最后一根K线的时间戳
    
    const aggregated: MarketData = {
      symbol: symbol,
      timestamp: group[group.length - 1].timestamp,
      open: group[0].open,
      high: Math.max(...group.map(item => item.high)),
      low: Math.min(...group.map(item => item.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, item) => sum + item.volume, 0)
    };
    
    result.push(aggregated);
  }
  
  return result;
}

export async function analyzeMarketData(input: MarketAnalysisInput, apiKey: string): Promise<string> {
  const closePrices = input.marketData.map(d => d.close);
  
  // Calculate MACD
  const macdInput = {
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  };
  const macdResult = MACD.calculate(macdInput);
  const latestMacd = macdResult[macdResult.length - 1];

  // Calculate RSI
  const rsiInput = {
    values: closePrices,
    period: 14,
  };
  const rsiResult = RSI.calculate(rsiInput);
  const latestRsi = rsiResult[rsiResult.length - 1];

  const currentDateTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

  // IMPORTANT: To avoid exceeding token limits, we no longer send the full 200 data points.
  // We send only the most recent data point as a summary for context.
  const latestDataPoint = input.marketData[input.marketData.length - 1];

  const promptText = `你是一位专业的金融市场分析师，精通价格行为理论、MACD和RSI等技术指标。

基于以下最新的市场数据摘要和计算出的技术指标，请对当前的市场情绪进行一次深入、专业的分析。

请使用优雅的Markdown格式生成分析报告，避免过度使用粗体，采用清晰的层级结构：

# 市场分析报告

> 报告生成时间：${currentDateTime}

## 市场情绪概览
[用一句话总结当前是看涨、看跌还是中性/震荡的市场情绪]

## 价格行为分析

### 支撑与阻力
- 基于最新的价格信息，识别可能的短期支撑位和阻力位

### K线形态
- 分析最近的K线形态（例如，吞没形态、十字星、锤头线等）

### 趋势判断
- 描述当前的价格趋势（是上涨、下跌还是横盘整理）

## 技术指标解读

### MACD 分析
分析MACD线、信号线和柱状图，判断动能的强度和潜在的交叉信号。

### RSI 分析
分析RSI值，判断市场是否处于超买（>70）或超卖（<30）区域。

## 策略建议

结合以上所有分析，为短线交易者提供清晰、可操作的建议。包括：
- 入场点位和时机
- 止损位设置
- 目标价位
- 风险提示

---

### 数据参考

当前市场数据：
\`\`\`
开盘: ${latestDataPoint.open}  最高: ${latestDataPoint.high}  最低: ${latestDataPoint.low}  收盘: ${latestDataPoint.close}
成交量: ${latestDataPoint.volume}  时间: ${new Date(latestDataPoint.timestamp).toLocaleString('zh-CN')}
\`\`\`

技术指标：
- MACD (12,26,9): ${latestMacd.MACD?.toFixed(2)} / Signal: ${latestMacd.signal?.toFixed(2)} / Histogram: ${latestMacd.histogram?.toFixed(2)}
- RSI (14): ${latestRsi?.toFixed(2)}

请直接生成专业的分析报告，使用简洁明了的语言，避免过多的格式化标记。`;

  try {
    // 使用用户提供的 API 密钥直接调用 Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text();

    return text;
    
  } catch (error: any) {
    console.error("Error calling Google Generative AI:", error);
    
    // 提供用户友好的错误消息
    if (error.message?.includes('API key not valid') || error.message?.includes('permission_denied') || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('API key is invalid')) {
      throw new Error("您提供的 Gemini API 密钥无效或格式不正确，请检查后重试。");
    }
    
    throw new Error(`AI analysis failed: ${error.message || error}`);
  }
}

/**
 * 将3分钟数据聚合为15分钟数据后进行市场分析
 * @param input 包含200条3分钟OHLCV数据的输入
 * @param apiKey Google Gemini API密钥
 * @returns AI分析报告
 */
export async function analyzeMarketDataWith15MinAggregation(input: MarketAnalysisInput, apiKey: string): Promise<string> {
  // 将3分钟数据聚合为15分钟数据
  const aggregated15MinData = aggregateTo15Min(input.marketData);
  
  if (aggregated15MinData.length === 0) {
    throw new Error("聚合后的15分钟数据为空，无法进行分析。");
  }
  
  const closePrices = aggregated15MinData.map(d => d.close);
  
  // Calculate MACD using 15min aggregated data
  const macdInput = {
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  };
  const macdResult = MACD.calculate(macdInput);
  const latestMacd = macdResult[macdResult.length - 1];

  // Calculate RSI using 15min aggregated data
  const rsiInput = {
    values: closePrices,
    period: 14,
  };
  const rsiResult = RSI.calculate(rsiInput);
  const latestRsi = rsiResult[rsiResult.length - 1];

  const currentDateTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

  // 提供最近几个15分钟K线作为上下文（而不是只提供最新的一个）
  const recentDataPoints = aggregated15MinData.slice(-5); // 最近5个15分钟K线
  
  const promptText = `你是一位专业的金融市场分析师，精通价格行为理论、MACD和RSI等技术指标。

基于以下从3分钟数据聚合而来的15分钟市场数据和计算出的技术指标，请对当前的市场情绪进行一次深入、专业的分析。

请使用优雅的Markdown格式生成分析报告，避免过度使用粗体，采用清晰的层级结构：

# 市场分析报告

> 报告生成时间：${currentDateTime}  
> 数据来源：200条3分钟K线聚合为${aggregated15MinData.length}条15分钟K线

## 市场情绪概览
[基于15分钟时间框架，用一句话总结当前是看涨、看跌还是中性/震荡的市场情绪]

## 价格行为分析

### 支撑与阻力
- 基于15分钟时间框架的价格信息，识别可能的短期支撑位和阻力位

### K线形态
- 分析最近的15分钟K线形态和价格走势特征

### 趋势判断
- 描述当前基于15分钟周期的价格趋势（上涨、下跌或横盘整理）

## 技术指标解读

### MACD 分析
分析基于15分钟聚合数据的MACD线、信号线和柱状图，判断动能强度和交叉信号。

### RSI 分析
分析基于15分钟聚合数据的RSI值，判断是否处于超买或超卖区域。

## 策略建议

结合15分钟时间框架的分析，为短线到中线交易者提供操作建议：
- 关键价位和入场时机
- 止损位设置建议
- 目标价位预期
- 风险控制要点

---

### 数据参考

最新15分钟K线：
\`\`\`
开盘: ${recentDataPoints[recentDataPoints.length - 1].open}  最高: ${recentDataPoints[recentDataPoints.length - 1].high}  
最低: ${recentDataPoints[recentDataPoints.length - 1].low}  收盘: ${recentDataPoints[recentDataPoints.length - 1].close}
成交量: ${recentDataPoints[recentDataPoints.length - 1].volume}
时间: ${new Date(recentDataPoints[recentDataPoints.length - 1].timestamp).toLocaleString('zh-CN')}
\`\`\`

技术指标（15分钟）：
- MACD (12,26,9): ${latestMacd.MACD?.toFixed(2)} / Signal: ${latestMacd.signal?.toFixed(2)} / Histogram: ${latestMacd.histogram?.toFixed(2)}
- RSI (14): ${latestRsi?.toFixed(2)}

近期K线趋势：
\`\`\`
${recentDataPoints.map((d, i) => `${i + 1}. ${new Date(d.timestamp).toLocaleTimeString('zh-CN')} | 开:${d.open} 高:${d.high} 低:${d.low} 收:${d.close}`).join('\n')}
\`\`\`

请直接生成专业的分析报告，使用简洁明了的语言，突出15分钟时间框架的分析价值。`;

  try {
    // 使用用户提供的 API 密钥直接调用 Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text();

    return text;
    
  } catch (error: any) {
    console.error("Error calling Google Generative AI:", error);
    
    // 提供用户友好的错误消息
    if (error.message?.includes('API key not valid') || error.message?.includes('permission_denied') || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('API key is invalid')) {
      throw new Error("您提供的 Gemini API 密钥无效或格式不正确，请检查后重试。");
    }
    
    throw new Error(`AI analysis failed: ${error.message || error}`);
  }
}
