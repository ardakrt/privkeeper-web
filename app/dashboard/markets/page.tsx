"use client";

import { useMarketData } from '@/hooks/useMarketData';
import MarketsMobileView from '@/components/markets/MarketsMobileView';
import MarketsDesktopView from '@/components/markets/MarketsDesktopView';

export default function MarketsPage() {
  const data = useMarketData();

  return (
    <div className="w-full h-full">
      <div className="md:hidden h-full">
        <MarketsMobileView data={data} />
      </div>
      <div className="hidden md:block h-full">
        <MarketsDesktopView data={data} />
      </div>
    </div>
  );
}
