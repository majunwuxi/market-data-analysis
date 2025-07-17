import { MarketDataClient } from '@/components/market-data-client';

export default function Home() {
  return (
    <main className="bg-background min-h-screen w-full flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold text-primary mb-2">
            市场快照
          </h1>
          <p className="text-muted-foreground text-lg">
            获取您关注资产的最新OHLCV数据，并获得AI驱动的市场分析。
          </p>
        </header>
        <MarketDataClient />
      </div>
    </main>
  );
}
