"use client";

import React from 'react';
import { ExternalLink, Clock, Globe, MessageSquare, Twitter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { NewsItem } from '@/types/news';

interface NewsItemProps {
  news: NewsItem;
  showChinese?: boolean;
  onToggleLanguage?: () => void;
  className?: string;
}

export function NewsItemComponent({ 
  news, 
  showChinese = false, 
  onToggleLanguage, 
  className = '' 
}: NewsItemProps) {
  
  // 根据语言设置选择显示的内容
  const displayTitle = showChinese && news.titleChinese ? news.titleChinese : news.title;
  const displayContent = showChinese && news.contentChinese ? news.contentChinese : news.content;
  
  // 格式化时间显示
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) {
        return '刚刚';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours}小时前`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days}天前`;
      }
    } catch (error) {
      return '时间未知';
    }
  };

  // 提取标签和关键词
  const extractTags = (content: string) => {
    const tags: string[] = [];
    
    // 提取股票代码 ($AAPL, $GOOGL等)
    const stockSymbols = content.match(/\$[A-Z]{1,5}/g);
    if (stockSymbols) {
      tags.push(...stockSymbols.slice(0, 3)); // 最多显示3个股票代码
    }
    
    // 提取话题标签 (#hashtag)
    const hashtags = content.match(/#[a-zA-Z0-9_]+/g);
    if (hashtags) {
      tags.push(...hashtags.slice(0, 2)); // 最多显示2个话题标签
    }
    
    return [...new Set(tags)]; // 去重
  };

  const tags = extractTags(news.content);
  
  // 检查是否有链接
  const hasLink = news.url && news.url.trim() !== '';

  return (
    <Card className={`group hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 ${className}`}>
      <CardContent className="p-4">
        {/* 头部：时间和来源 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Twitter className="h-3 w-3" />
            <span>推文</span>
            <Separator orientation="vertical" className="h-3" />
            <Clock className="h-3 w-3" />
            <span>{formatTime(news.publishedAt)}</span>
          </div>
          
          {/* 语言切换按钮 */}
          {onToggleLanguage && news.titleChinese && news.contentChinese && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLanguage}
              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              title={showChinese ? "切换到英文" : "切换到中文"}
            >
              <Globe className="h-3 w-3 mr-1" />
              {showChinese ? "EN" : "中"}
            </Button>
          )}
        </div>

        {/* 标题 */}
        <div className="mb-3">
          <h3 className="font-medium text-sm leading-relaxed text-foreground line-clamp-2">
            {displayTitle}
          </h3>
        </div>

        {/* 内容 */}
        <div className="mb-3">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {displayContent}
          </p>
        </div>

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs px-2 py-0.5 font-mono"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* 底部：操作按钮 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {/* 翻译状态指示 */}
            {news.titleChinese && news.contentChinese && (
              <Badge variant="outline" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                已翻译
              </Badge>
            )}
          </div>
          
          {/* 原文链接 */}
          {hasLink && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <a 
                href={news.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                <span>原文</span>
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 