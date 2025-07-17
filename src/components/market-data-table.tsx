import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarketData } from "@/types/market";
import { getTimezoneForSymbol } from "@/lib/timezone-helper";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

interface MarketDataTableProps {
  data: MarketData[];
  showOhlcv: boolean;
  symbol: string;
}

// This function now converts the exchange-local datetime string to Beijing Time for display.
const formatInBeijingTime = (datetime: string, symbol: string) => {
  const exchangeTimeZone = getTimezoneForSymbol(symbol);
  const beijingTimeZone = "Asia/Shanghai";
  
  // 1. Parse the datetime string in the context of the exchange's timezone.
  const dateInExchangeTz = fromZonedTime(datetime, exchangeTimeZone);
  
  // 2. Format that date object into a string using Beijing Time.
  return formatInTimeZone(dateInExchangeTz, beijingTimeZone, "yyyy-MM-dd HH:mm:ss");
};


export function MarketDataTable({ data, showOhlcv, symbol }: MarketDataTableProps) {
  const beijingTimeZone = "Asia/Shanghai";
  const timeZoneName = new Intl.DateTimeFormat('zh-CN', { timeZone: beijingTimeZone, timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value;

  const sortedData = [...data].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="rounded-md border mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间 ({timeZoneName})</TableHead>
            {showOhlcv && (
              <>
                <TableHead className="text-right">开盘价</TableHead>
                <TableHead className="text-right">最高价</TableHead>
                <TableHead className="text-right">最低价</TableHead>
              </>
            )}
            <TableHead className="text-right">收盘价</TableHead>
            {showOhlcv && <TableHead className="text-right">成交量</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((record) => (
            <TableRow key={record.timestamp}>
              <TableCell className="font-medium">
                {formatInBeijingTime(record.datetime, symbol)}
              </TableCell>
              {showOhlcv && (
                <>
                  <TableCell className="text-right">
                    {record.open.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.high.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.low.toLocaleString()}
                  </TableCell>
                </>
              )}
              <TableCell className="text-right font-semibold text-primary">
                {record.close.toLocaleString()}
              </TableCell>
              {showOhlcv && (
                <TableCell className="text-right">
                  {record.volume.toLocaleString()}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
