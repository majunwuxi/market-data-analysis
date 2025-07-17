"use client";

import type { MarketData } from "@/types/market";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketDataTable } from "./market-data-table";
import { MarketDataChart } from "./market-data-chart";
import { Button } from "./ui/button";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Activity, Clock, Target, AlertTriangle } from "lucide-react";
import * as React from "react";
import { analyzeMarketSentiment, analyzeMarketSentimentWith15MinAggregation } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";


interface MarketDataDisplayProps {
  data: MarketData[];
  showOhlcv: boolean;
  title: string;
  symbol: string;
  isAnalysisEnabled: boolean;
  show15MinAggregation?: boolean; // 新增：是否显示15分钟聚合分析选项
}

// 自定义Markdown组件样式 - 优化网页显示效果
const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-border">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-lg font-semibold text-foreground mb-3 mt-6 flex items-center gap-2">
      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
      <span>{children}</span>
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-base font-medium text-foreground mb-2 mt-4 flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full flex-shrink-0"></div>
      <span>{children}</span>
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="space-y-2 mb-4 pl-0">{children}</ul>
  ),
  li: ({ children }: any) => (
    <li className="text-sm text-muted-foreground flex items-start gap-3">
      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children }: any) => (
    <span className="font-medium text-foreground">{children}</span>
  ),
  code: ({ children }: any) => (
    <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-foreground border">
      {children}
    </code>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-muted p-3 rounded-lg border text-xs font-mono text-foreground overflow-x-auto mb-4">
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-primary/40 pl-4 my-4 bg-primary/5 py-3 rounded-r text-sm italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="border-border my-6" />
  ),
};

// 解析并美化显示市场情绪
function parseMarketSentiment(text: string) {
  const sentimentMatch = text.match(/市场情绪总结[^:：]*[:：]\s*([^。\n]*)/i);
  if (sentimentMatch) {
    const sentiment = sentimentMatch[1].trim();
    const isPositive = /看涨|上涨|乐观|积极/i.test(sentiment);
    const isNegative = /看跌|下跌|悲观|消极/i.test(sentiment);
    
    return (
      <div className="flex items-center gap-3 mb-4 p-4 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 border border-border">
        <div className="flex-shrink-0">
          {isPositive ? (
            <TrendingUp className="h-6 w-6 text-green-500" />
          ) : isNegative ? (
            <TrendingDown className="h-6 w-6 text-red-500" />
          ) : (
            <Activity className="h-6 w-6 text-yellow-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground font-medium mb-1">市场情绪</div>
          <div className="font-semibold text-foreground text-sm">{sentiment}</div>
        </div>
        <div className="flex-shrink-0">
          <Badge 
            variant={isPositive ? "default" : isNegative ? "destructive" : "secondary"}
            className="text-xs px-2 py-1"
          >
            {isPositive ? "看涨" : isNegative ? "看跌" : "中性"}
          </Badge>
        </div>
      </div>
    );
  }
  return null;
}

// 解析生成时间
function parseGenerationTime(text: string) {
  const timeMatch = text.match(/报告生成时间[^:：]*[:：]\s*([^\n]*)/i);
  if (timeMatch) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 px-3 py-2 bg-muted/20 rounded-md">
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span>生成时间: {timeMatch[1].trim()}</span>
      </div>
    );
  }
  return null;
}

export function MarketDataDisplay({ data, showOhlcv, title, symbol, isAnalysisEnabled, show15MinAggregation = false }: MarketDataDisplayProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [is15MinAnalyzing, setIs15MinAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);
  const [analysis15MinResult, setAnalysis15MinResult] = React.useState<string | null>(null);
  
  const tableData = data.length > 5 ? data.slice(data.length - 5) : data;

  const handleAnalysis = async () => {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        toast({
            variant: "destructive",
            title: "需要 API 密钥",
            description: "请先在页面顶部的配置区域设置您的 Gemini API 密钥。",
        });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    const result = await analyzeMarketSentiment(data, apiKey);
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "分析失败",
        description: result.error,
      });
    } else {
      setAnalysisResult(result.analysis!);
    }
    
    setIsAnalyzing(false);
  };

  const handle15MinAggregatedAnalysis = async () => {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        toast({
            variant: "destructive",
            title: "需要 API 密钥",
            description: "请先在页面顶部的配置区域设置您的 Gemini API 密钥。",
        });
        return;
    }

    setIs15MinAnalyzing(true);
    setAnalysis15MinResult(null);
    
    const result = await analyzeMarketSentimentWith15MinAggregation(data, apiKey);
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "15分钟聚合分析失败",
        description: result.error,
      });
    } else {
      setAnalysis15MinResult(result.analysis!);
    }
    
    setIs15MinAnalyzing(false);
  };

  // 清理并处理分析结果
  const cleanAnalysisResult = React.useMemo(() => {
    if (!analysisResult) return null;
    
    // 尝试解析JSON格式
    try {
      const parsed = JSON.parse(analysisResult);
      if (parsed.report) {
        return parsed.report;
      }
    } catch {
      // 如果不是JSON，直接使用原文本
    }
    
    // 清理可能的JSON格式标记
    return analysisResult
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .replace(/^{\s*"report"\s*:\s*"/, '')
      .replace(/"\s*}$/, '')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"');
  }, [analysisResult]);

  // 清理并处理15分钟聚合分析结果
  const clean15MinAnalysisResult = React.useMemo(() => {
    if (!analysis15MinResult) return null;
    
    // 尝试解析JSON格式
    try {
      const parsed = JSON.parse(analysis15MinResult);
      if (parsed.report) {
        return parsed.report;
      }
    } catch {
      // 如果不是JSON，直接使用原文本
    }
    
    // 清理可能的JSON格式标记
    return analysis15MinResult
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .replace(/^{\s*"report"\s*:\s*"/, '')
      .replace(/"\s*}$/, '')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"');
  }, [analysis15MinResult]);
  
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-x-4 bg-gradient-to-r from-background to-muted/20 border-b">
        <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="truncate">{title}</span>
              <Badge variant="outline" className="text-xs font-normal">
                {symbol}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              共 {data.length} 个数据点
            </CardDescription>
        </div>
        {isAnalysisEnabled && (
           <div className="flex-shrink-0">
             {show15MinAggregation ? (
               <Button 
                 onClick={handle15MinAggregatedAnalysis} 
                 disabled={is15MinAnalyzing}
                 className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-sm"
                 size="sm"
               >
                  {is15MinAnalyzing ? ( 
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  ) : ( 
                    <Sparkles className="mr-2 h-4 w-4" /> 
                  )}
                  AI分析
               </Button>
             ) : (
               <Button 
                 onClick={handleAnalysis} 
                 disabled={isAnalyzing}
                 className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-sm"
                 size="sm"
               >
                  {isAnalyzing ? ( 
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  ) : ( 
                    <Sparkles className="mr-2 h-4 w-4" /> 
                  )}
                  AI分析
               </Button>
             )}
           </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30">
            <TabsTrigger value="table" className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              <span>表格视图</span>
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>图表视图</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <MarketDataTable data={tableData} showOhlcv={showOhlcv} symbol={symbol} />
          </TabsContent>
          <TabsContent value="chart">
            <MarketDataChart data={data} symbol={symbol} />
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {(isAnalyzing || is15MinAnalyzing) && (
        <CardFooter className="bg-muted/30 border-t">
            <div className="w-full flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="relative mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <Sparkles className="h-6 w-6 text-primary/60 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  {show15MinAggregation && is15MinAnalyzing ? "AI正在进行聚合分析" : "AI正在分析市场数据"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  {show15MinAggregation && is15MinAnalyzing
                    ? "正在将3分钟数据聚合为15分钟数据并运用技术指标分析..." 
                    : "正在运用深度学习算法分析技术指标和价格行为..."
                  }
                </p>
            </div>
        </CardFooter>
      )}
      
            {(show15MinAggregation ? clean15MinAnalysisResult : cleanAnalysisResult) && (
         <CardFooter className="bg-gradient-to-b from-muted/20 to-muted/40 border-t p-6">
            <div className="w-full space-y-6">
                {/* 标题区域 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-foreground">AI市场分析报告</h3>
                      <p className="text-sm text-muted-foreground">
                        {show15MinAggregation ? "基于15分钟聚合数据的技术指标分析" : "基于技术指标的智能分析"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    <Target className="h-3 w-3" />
                    <span className="text-xs">{show15MinAggregation ? "聚合分析" : "专业分析"}</span>
                  </Badge>
                </div>

                <Separator className="bg-border" />

                {/* 生成时间 */}
                {parseGenerationTime(show15MinAggregation ? clean15MinAnalysisResult : cleanAnalysisResult)}

                {/* 市场情绪概览 */}
                {parseMarketSentiment(show15MinAggregation ? clean15MinAnalysisResult : cleanAnalysisResult)}

                {/* 主要分析内容 */}
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown components={MarkdownComponents}>
                      {show15MinAggregation ? clean15MinAnalysisResult : cleanAnalysisResult}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* 免责声明 */}
                <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed">
                    <strong className="font-medium">风险提示：</strong>
                    本分析仅供参考，不构成投资建议。市场有风险，投资需谨慎。请结合自身情况做出投资决策。
                  </div>
                </div>
            </div>
         </CardFooter>
       )}
    </Card>
  );
}
