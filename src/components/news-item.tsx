import React from 'react';
import { ExternalLink, Clock, Globe2, Languages } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NewsItem } from '@/types/news';

interface NewsItemProps {
  news: NewsItem;
  showChinese?: boolean;
  onToggleLanguage?: () => void;
  className?: string;
}

export function NewsItemComponent({ news, showChinese = false, onToggleLanguage, className }: NewsItemProps) {
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours >= 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}天前`;
    } else if (diffHours >= 1) {
      return `${diffHours}小时前`;
    } else if (diffMinutes >= 1) {
      return `${diffMinutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(news.url, '_blank', 'noopener,noreferrer');
  };

  // 判断是否有中文翻译
  const hasTranslation = Boolean(news.titleChinese && news.summaryChinese);
  
  // 获取显示的标题和摘要
  const displayTitle = (showChinese && news.titleChinese) ? news.titleChinese : news.title;
  const displaySummary = (showChinese && news.summaryChinese) ? news.summaryChinese : news.summary;

  return (
    <Card className={`group hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 ${className}`}>
      <CardContent className="p-4">
        {/* 头部：时间和语言切换 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(news.publishedAt)}</span>
            <Badge variant="outline" className="text-xs">
              <Globe2 className="h-3 w-3 mr-1" />
              BBC商业
            </Badge>
          </div>
          
          {hasTranslation && onToggleLanguage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLanguage}
              className="h-6 px-2 text-xs hover:bg-muted/50"
              title={showChinese ? "显示英文" : "显示中文"}
            >
              <Languages className="h-3 w-3 mr-1" />
              {showChinese ? "EN" : "中"}
            </Button>
          )}
        </div>

        {/* 标题 */}
        <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {displayTitle}
        </h3>

        {/* 摘要 */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
          {displaySummary}
        </p>

        {/* 底部：阅读链接和语言指示器 */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExternalClick}
            className="h-7 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            阅读原文
          </Button>
          
          <div className="flex items-center gap-1">
            {!hasTranslation && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                英文原版
              </Badge>
            )}
            {hasTranslation && (
              <Badge 
                variant={showChinese ? "default" : "secondary"} 
                className="text-xs px-1.5 py-0.5"
              >
                {showChinese ? "中文翻译" : "英文原版"}
              </Badge>
            )}
          </div>
        </div>

        {/* 图片 */}
        {news.imageUrl && (
          <div className="mt-3 rounded-md overflow-hidden">
            <img
              src={news.imageUrl}
              alt={displayTitle}
              className="w-full h-24 object-cover hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 添加CSS类用于文本截断
const styles = `
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
`;

// 在组件首次渲染时注入样式
if (typeof document !== 'undefined' && !document.querySelector('#news-item-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'news-item-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 