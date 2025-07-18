import { MarketDataClient } from '@/components/market-data-client';
import { NewsPanel } from '@/components/news-panel';

export default function Home() {
  return (
    <main className="bg-background min-h-screen w-full p-4 sm:p-6 lg:p-8">
      {/* 页面标题 */}
      <header className="text-center mb-6 lg:mb-8">
        <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mb-2">
          市场快照
        </h1>
        <p className="text-muted-foreground text-base lg:text-lg">
          获取您关注资产的最新OHLCV数据，并获得AI驱动的市场分析和实时商业推文。
        </p>
      </header>

      {/* 主要内容区域 - 响应式左右布局 */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* 左侧：市场数据分析 - 在大屏幕上占2/3宽度 */}
          <div className="xl:col-span-2">
            <MarketDataClient />
          </div>
          
          {/* 右侧：商业推文面板 - 在大屏幕上占1/3宽度 */}
          <div className="xl:col-span-1">
            <NewsPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
