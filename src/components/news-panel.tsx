"use client";

import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, Languages, Loader2, AlertCircle, Wifi, WifiOff, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { NewsItemComponent } from './news-item';
import { getBusinessNews, translateNews, refreshNewsCache } from '@/app/actions';
import type { NewsItem, NewsStatus } from '@/types/news';

interface NewsPanelProps {
  className?: string;
}

export function NewsPanel({ className }: NewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<NewsStatus>('loading');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showChinese, setShowChinese] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // 从localStorage获取语言偏好
  useEffect(() => {
    const savedLanguage = localStorage.getItem('news_language_preference');
    if (savedLanguage === 'chinese') {
      setShowChinese(true);
    }
  }, []);

  // 保存语言偏好到localStorage
  const saveLanguagePreference = (isChinese: boolean) => {
    localStorage.setItem('news_language_preference', isChinese ? 'chinese' : 'english');
  };

  // 初始加载新闻
  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setStatus('loading');
      setError(null);
      
      const result = await getBusinessNews();
      
      if (result.error) {
        setError(result.error);
        setStatus('error');
        toast({
          variant: "destructive",
          title: "新闻加载失败",
          description: result.error,
        });
      } else if (result.news) {
        setNews(result.news);
        setStatus(result.status || 'fresh');
        setLastUpdated(result.lastUpdated || null);
        
        // 如果有翻译的新闻且用户偏好中文，自动显示中文
        const hasTranslations = result.news.some(item => item.titleChinese);
        if (hasTranslations && localStorage.getItem('news_language_preference') === 'chinese') {
          setShowChinese(true);
        }
      }
    } catch (error) {
      console.error('❌ Error loading news:', error);
      setError('加载新闻时发生未知错误');
      setStatus('error');
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const result = await refreshNewsCache();
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "刷新失败",
          description: result.error,
        });
      } else if (result.news) {
        setNews(result.news);
        setStatus(result.status || 'fresh');
        setLastUpdated(result.lastUpdated || null);
        toast({
          title: "刷新成功",
          description: `已获取 ${result.news.length} 条最新资讯`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "刷新失败",
        description: "刷新新闻时发生错误",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTranslate = async () => {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "需要 API 密钥",
        description: "请先在页面顶部的配置区域设置您的 Gemini API 密钥。",
      });
      return;
    }

    try {
      setIsTranslating(true);
      const result = await translateNews(news, apiKey);
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "翻译失败",
          description: result.error,
        });
      } else if (result.news) {
        setNews(result.news);
        setShowChinese(true);
        saveLanguagePreference(true);
        toast({
          title: "翻译完成",
          description: "推文已成功翻译为中文",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "翻译失败",
        description: "翻译过程中发生错误",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleLanguage = () => {
    const newShowChinese = !showChinese;
    setShowChinese(newShowChinese);
    saveLanguagePreference(newShowChinese);
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'loading':
        return { icon: Loader2, text: '加载中...', color: 'text-blue-500' };
      case 'cached':
        return { icon: Wifi, text: '缓存数据', color: 'text-green-500' };
      case 'fresh':
        return { icon: Wifi, text: '最新数据', color: 'text-green-600' };
      case 'translating':
        return { icon: Languages, text: '翻译中...', color: 'text-orange-500' };
      case 'error':
        return { icon: WifiOff, text: '加载失败', color: 'text-red-500' };
      default:
        return { icon: Wifi, text: '就绪', color: 'text-gray-500' };
    }
  };

  const statusInfo = getStatusInfo();
  const hasAnyTranslation = news.some(item => item.titleChinese && item.contentChinese);
  const canShowChinese = hasAnyTranslation && showChinese;

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            商业推文
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* 状态指示器 */}
            <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
              <statusInfo.icon className={`h-3 w-3 mr-1 ${status === 'loading' || status === 'translating' ? 'animate-spin' : ''}`} />
              {statusInfo.text}
            </Badge>
            
            {/* 刷新按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || status === 'loading'}
              className="h-7 w-7 p-0"
              title="刷新推文"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* 功能按钮行 */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {lastUpdated && (
              <span>最后更新: {new Date(lastUpdated).toLocaleTimeString('zh-CN')}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* 翻译按钮 */}
            {!hasAnyTranslation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating || news.length === 0}
                className="h-7 px-2 text-xs"
              >
                {isTranslating ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Languages className="h-3 w-3 mr-1" />
                )}
                翻译
              </Button>
            )}
            
            {/* 语言切换按钮 */}
            {hasAnyTranslation && (
              <Button
                variant={canShowChinese ? "default" : "outline"}
                size="sm"
                onClick={toggleLanguage}
                className="h-7 px-2 text-xs"
                title={showChinese ? "切换到英文" : "切换到中文"}
              >
                <Languages className="h-3 w-3 mr-1" />
                {showChinese ? "中文" : "English"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 overflow-hidden p-0">
        {/* 错误状态 */}
        {error && (
          <div className="p-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* 加载状态 */}
        {status === 'loading' && !error && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">正在获取最新商业推文...</p>
          </div>
        )}

        {/* 新闻列表 */}
        {news.length > 0 && !error && (
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-3">
              {news.map((item, index) => (
                <NewsItemComponent
                  key={item.id}
                  news={item}
                  showChinese={canShowChinese}
                  onToggleLanguage={hasAnyTranslation ? toggleLanguage : undefined}
                  className="last:mb-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {news.length === 0 && status !== 'loading' && !error && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">暂无推文数据</p>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              重新加载
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 