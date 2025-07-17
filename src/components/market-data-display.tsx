"use client";

import type { MarketData } from "@/types/market";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketDataTable } from "./market-data-table";
import { MarketDataChart } from "./market-data-chart";
import { Button } from "./ui/button";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Activity, Clock, Target, AlertTriangle } from "lucide-react";
import * as React from "react";
import { analyzeMarketSentiment } from "@/app/actions";
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
}

// 自定义Markdown组件样式
const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-xl font-bold text-foreground mb-3 flex items-center">
      <Activity className="mr-2 h-5 w-5 text-primary" />
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-lg font-semibold text-foreground mb-2 mt-4 flex items-center">
      <div className="w-2 h-2 bg-primary rounded-full mr-2" />
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-base font-medium text-foreground mb-2 mt-3 flex items-center">
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mr-2" />
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-none space-y-1 mb-3">{children}</ul>
  ),
  li: ({ children }: any) => (
    <li className="text-sm text-muted-foreground flex items-start">
      <div className="w-1 h-1 bg-primary rounded-full mr-2 mt-2 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ children }: any) => (
    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
      {children}
    </code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-primary pl-4 my-3 bg-muted/30 py-2 rounded-r">
      {children}
    </blockquote>
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
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 border">
        {isPositive ? (
          <TrendingUp className="h-5 w-5 text-green-500" />
        ) : isNegative ? (
          <TrendingDown className="h-5 w-5 text-red-500" />
        ) : (
          <Activity className="h-5 w-5 text-yellow-500" />
        )}
        <div>
          <span className="text-xs text-muted-foreground">市场情绪</span>
          <div className="font-medium text-foreground">{sentiment}</div>
        </div>
        <Badge 
          variant={isPositive ? "default" : isNegative ? "destructive" : "secondary"}
          className="ml-auto"
        >
          {isPositive ? "看涨" : isNegative ? "看跌" : "中性"}
        </Badge>
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Clock className="h-3 w-3" />
        <span>生成时间: {timeMatch[1].trim()}</span>
      </div>
    );
  }
  return null;
}

export function MarketDataDisplay({ data, showOhlcv, title, symbol, isAnalysisEnabled }: MarketDataDisplayProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);
  
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
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-x-2 bg-gradient-to-r from-background to-muted/20">
        <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge variant="outline" className="text-xs">{symbol}</Badge>
            </CardTitle>
            <CardDescription>共 {data.length} 个数据点</CardDescription>
        </div>
        {isAnalysisEnabled && (
           <div className="flex flex-col items-end space-y-2 text-right">
             <Button 
               onClick={handleAnalysis} 
               disabled={isAnalyzing}
               className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
             >
                {isAnalyzing ? ( 
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                ) : ( 
                  <Sparkles className="mr-2 h-4 w-4" /> 
                )}
                AI分析
             </Button>
           </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              表格视图
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              图表视图
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
      
      {isAnalyzing && (
        <CardFooter className="bg-muted/30">
            <div className="w-full flex flex-col items-center justify-center p-6 text-center">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <Sparkles className="h-6 w-6 text-primary/60 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="font-semibold text-lg mb-2">AI正在分析市场数据</h3>
                <p className="text-muted-foreground text-sm">正在运用深度学习算法分析技术指标和价格行为...</p>
            </div>
        </CardFooter>
      )}
      
      {cleanAnalysisResult && (
         <CardFooter className="bg-gradient-to-b from-muted/20 to-muted/40 border-t">
            <div className="w-full space-y-4">
                {/* 标题区域 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-foreground">AI市场分析报告</h3>
                      <p className="text-sm text-muted-foreground">基于技术指标的智能分析</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    专业分析
                  </Badge>
                </div>

                <Separator className="my-4" />

                {/* 生成时间 */}
                {parseGenerationTime(cleanAnalysisResult)}

                {/* 市场情绪概览 */}
                {parseMarketSentiment(cleanAnalysisResult)}

                {/* 主要分析内容 */}
                <div className="bg-card rounded-lg p-5 border shadow-sm">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown components={MarkdownComponents}>
                      {cleanAnalysisResult}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* 免责声明 */}
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>风险提示：</strong>本分析仅供参考，不构成投资建议。市场有风险，投资需谨慎。请结合自身情况做出投资决策。
                  </div>
                </div>
            </div>
         </CardFooter>
      )}
    </Card>
  );
}
