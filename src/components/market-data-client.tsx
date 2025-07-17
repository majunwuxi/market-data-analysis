"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Search, KeyRound, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getMarketData, getAllSymbols } from "@/app/actions";
import type { MarketData } from "@/types/market";
import { MarketDataDisplay } from "./market-data-display";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const formSchema = z.object({
  symbol: z.string().min(1, "必须选择一个交易品种。"),
});

export function MarketDataClient() {
  const [isLoading, setIsLoading] = React.useState(true); // Start with loading true
  const [isSymbolsLoading, setIsSymbolsLoading] = React.useState(true);
  const [symbols, setSymbols] = React.useState<string[]>([]);
  const [marketData1h, setMarketData1h] = React.useState<MarketData[] | null>(null);
  const [marketData3m, setMarketData3m] = React.useState<MarketData[] | null>(null);
  const [showOhlcv, setShowOhlcv] = React.useState(true);
  const [currentSymbol, setCurrentSymbol] = React.useState<string>("");
  const [apiKey, setApiKey] = React.useState("");
  const { toast } = useToast();
  const isInitialLoad = React.useRef(true);

  // Effect to load API key from localStorage on mount
  React.useEffect(() => {
    const storedApiKey = localStorage.getItem("gemini_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem("gemini_api_key", apiKey);
    toast({
      title: "成功",
      description: "API密钥已保存到您的浏览器本地存储中。",
    });
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: "",
    },
  });

  const onSubmit = React.useCallback(async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setMarketData1h(null);
    setMarketData3m(null);
    setCurrentSymbol(values.symbol);
    const result = await getMarketData(values.symbol);
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "错误",
        description: result.error,
      });
      setMarketData1h(null);
      setMarketData3m(null);
    } else {
      if (result.data1h) setMarketData1h(result.data1h);
      if (result.data3m) setMarketData3m(result.data3m);
    }
    setIsLoading(false);
  }, [toast]);

  React.useEffect(() => {
    async function fetchInitialData() {
      if (!isInitialLoad.current) return;
      isInitialLoad.current = false;

      setIsSymbolsLoading(true);
      const result = await getAllSymbols();
      if (result.error) {
        toast({
          variant: "destructive",
          title: "获取交易品种列表失败",
          description: result.error,
        });
        setSymbols([]);
        setIsSymbolsLoading(false);
        setIsLoading(false);
      } else if (result.symbols) {
        setSymbols(result.symbols);
        const defaultSymbol = "MES";
        let symbolToFetch = "";
        if (result.symbols.includes(defaultSymbol)) {
          symbolToFetch = defaultSymbol;
        } else if (result.symbols.length > 0) {
          symbolToFetch = result.symbols[0];
        }

        if (symbolToFetch) {
          form.setValue("symbol", symbolToFetch);
          await onSubmit({ symbol: symbolToFetch });
        } else {
            setIsLoading(false);
        }
      }
      setIsSymbolsLoading(false);
    }
    
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const hasData = (marketData1h && marketData1h.length > 0) || (marketData3m && marketData3m.length > 0);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
            <CardTitle>配置</CardTitle>
            <CardDescription>配置您的交易品种和AI分析设置。</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>AI分析设置</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                 <p className="text-sm text-muted-foreground">
                    请输入您的Gemini API密钥。该密钥将仅保存在您的浏览器本地，不会上传到服务器。
                 </p>
                 <div className="flex items-center space-x-2">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <Input 
                      type="password"
                      placeholder="在此处粘贴您的 Gemini API 密钥"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSaveApiKey} variant="outline" size="icon" aria-label="Save API Key">
                      <Save className="h-4 w-4" />
                    </Button>
                 </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>交易品种</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={isSymbolsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isSymbolsLoading ? "正在加载交易品种..." : "请选择一个交易品种"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {symbols.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button type="submit" disabled={isLoading || isSymbolsLoading} className="w-full md:w-auto" variant="outline">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  获取数据
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center p-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
      
      {hasData && !isLoading && (
         <div className="animate-in fade-in-50 duration-500 space-y-4">
           <div className="flex items-center space-x-2">
            <Checkbox id="showOhlcv" checked={showOhlcv} onCheckedChange={(checked) => setShowOhlcv(Boolean(checked))} />
            <Label htmlFor="showOhlcv" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              显示 OHLCV 详细数据
            </Label>
          </div>
         </div>
      )}

      <div className="space-y-8">
        {marketData1h && marketData1h.length > 0 && !isLoading && (
          <div className="animate-in fade-in-50 duration-500">
            <MarketDataDisplay 
              data={marketData1h} 
              showOhlcv={showOhlcv} 
              title="1小时数据" 
              symbol={currentSymbol}
              isAnalysisEnabled={true}
             />
          </div>
        )}

                {marketData3m && marketData3m.length > 0 && !isLoading &&(
          <div className="animate-in fade-in-50 duration-500">
            <MarketDataDisplay 
              data={marketData3m} 
              showOhlcv={showOhlcv} 
              title="3分钟数据" 
              symbol={currentSymbol}
              // 3分钟数据同样启用AI分析
              isAnalysisEnabled={true}
              // 3分钟数据启用15分钟聚合分析选项
              show15MinAggregation={true}
              />
          </div>
        )}
      </div>
    </div>
  );
}
