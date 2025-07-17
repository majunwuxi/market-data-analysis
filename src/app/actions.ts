"use server";

import type { MarketData } from "@/types/market";
import { getDocClient } from "@/lib/dynamodb";
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";
import { analyzeMarketData, analyzeMarketDataWith15MinAggregation } from "@/ai/flows/analyze-market-flow";

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
