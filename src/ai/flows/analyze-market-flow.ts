'use server';
/**
 * @fileOverview A market analysis function that works in serverless environment.
 *
 * - analyzeMarketData - A simple function that handles the market analysis process.
 * - MarketAnalysisInput - The input type for the analyzeMarketData function.
 */

import { z } from 'zod';
import { MACD, RSI } from 'technicalindicators';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MarketDataSchema } from '@/types/market';

const MarketAnalysisInputSchema = z.object({
  marketData: z.array(MarketDataSchema).describe('An array of the latest 200 OHLCV data points.'),
});
export type MarketAnalysisInput = z.infer<typeof MarketAnalysisInputSchema>;

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

你的分析报告需要采用Markdown格式，并且必须包含以下几个部分：

- **报告生成时间**: ${currentDateTime}
- **市场情绪总结 (Market Sentiment Summary)**: 一句话总结当前是看涨、看跌还是中性/震荡。
- **价格行为分析 (Price Action Analysis)**:
    - 基于最新的价格信息，识别可能的短期支撑位和阻力位。
    - 分析最近的K线形态（例如，吞没形态、十字星、锤头线等）。
    - 描述当前的价格趋势（是上涨、下跌还是横盘整理）。
- **技术指标解读 (Technical Indicators Reading)**:
    - **MACD**: 分析MACD线、信号线和柱状图，判断动能的强度和潜在的交叉信号。
    - **RSI**: 分析RSI值，判断市场是否处于超买（>70）或超卖（<30）区域。
- **综合策略建议 (Synthesized Strategy Suggestion)**: 结合以上所有分析，为短线交易者提供一个清晰、可操作的建议。例如，"建议在XX价格附近观察，如果出现看涨信号，可考虑做多，止损设在YY"，或 "当前信号混杂，建议保持观望"。

**最新市场数据点 (Latest Data Point):**
\`\`\`json
${JSON.stringify(latestDataPoint, null, 2)}
\`\`\`

**计算出的技术指标:**
- **MACD (12, 26, 9)**: MACD: ${latestMacd.MACD?.toFixed(2)}, Signal: ${latestMacd.signal?.toFixed(2)}, Histogram: ${latestMacd.histogram?.toFixed(2)}
- **RSI (14)**: ${latestRsi?.toFixed(2)}

请直接生成报告。`;

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
