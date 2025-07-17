"use client";

import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  Bar,
  ReferenceArea,
} from "recharts";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MarketData } from "@/types/market";
import { getTimezoneForSymbol } from "@/lib/timezone-helper";
import React from "react";

interface MarketDataChartProps {
  data: MarketData[];
  symbol: string;
}

const chartConfig = {
  ohlc: {
    label: "K线",
  },
  up: {
    label: "上涨",
    color: "hsl(var(--primary))",
  },
  down: {
    label: "下跌",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

const formatTimeInBeijing = (datetime: string, symbol: string) => {
  const exchangeTimeZone = getTimezoneForSymbol(symbol);
  const beijingTimeZone = "Asia/Shanghai";
  const dateInExchangeTz = fromZonedTime(datetime, exchangeTimeZone);
  return formatInTimeZone(dateInExchangeTz, beijingTimeZone, "HH:mm");
};

// Custom shape for the candlestick
const Candle = (props: any) => {
  const { x, y, width, height, high, low, open, close } = props;

  const isUp = close >= open;
  const color = isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))";

  const bodyWidth = width * 0.8;
  const bodyX = x + width * 0.1;

  // The y passed by recharts is for the top of the bar.
  // For an up candle, top is `close`. For a down candle, top is `open`.
  const bodyTopY = y;
  const bodyBottomY = y + height;

  const wickX = x + width / 2;
  
  // Recharts doesn't give us the y-scale function, so we have to calculate the coordinates for high and low manually.
  // We know the y-coordinates for open and close, and their values. We can derive the scale from that.
  const valueRange = Math.abs(open - close);
  const pixelRange = height;
  const pixelsPerValuePoint = valueRange > 0 ? pixelRange / valueRange : 0;
  
  const highY = bodyTopY - (high - Math.max(open, close)) * pixelsPerValuePoint;
  const lowY = bodyBottomY + (Math.min(open, close) - low) * pixelsPerValuePoint;

  return (
    <g stroke={color} fill={color} strokeWidth={1}>
      {/* Wick */}
      <line x1={wickX} y1={highY} x2={wickX} y2={lowY} />
      {/* Body */}
      <rect x={bodyX} y={bodyTopY} width={bodyWidth} height={height} />
    </g>
  );
};


const CustomTooltip = ({ active, payload, label, coordinate }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2 text-xs bg-background border rounded-md shadow-lg">
          <p className="font-bold">{label}</p>
          <p><span className="font-semibold">开:</span> {data.open.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p><span className="font-semibold">高:</span> {data.high.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p><span className="font-semibold">低:</span> {data.low.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p><span className="font-semibold">收:</span> {data.close.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p><span className="font-semibold">成交量:</span> {data.volume.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };


export function MarketDataChart({ data, symbol }: MarketDataChartProps) {
  const chartData = data
    .map((d) => ({
      ...d,
      displayTime: formatTimeInBeijing(d.datetime, symbol),
      // For recharts bar, value is the range [min(open,close), max(open,close)]
      ohlc: [d.open, d.close].sort((a,b) => a-b),
    }));

  const yDomain = [
      Math.min(...data.map(d => d.low)) * 0.995,
      Math.max(...data.map(d => d.high)) * 1.005
  ];

  return (
    <div className="mt-4">
      <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
        <ComposedChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="displayTime"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={yDomain}
            orientation="right"
            tickFormatter={(value) =>
              typeof value === "number" ? `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : ""
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <ChartLegend content={<ChartLegendContent />} />
          
          <Bar dataKey="ohlc" shape={<Candle />} >
            {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} />
            ))}
          </Bar>
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
