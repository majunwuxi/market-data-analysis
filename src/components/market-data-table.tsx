import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarketData } from "@/types/market";
import { formatDateTimeInBeijing } from "@/lib/timezone-helper";

interface MarketDataTableProps {
  data: MarketData[];
  showOhlcv: boolean;
  symbol: string;
}

// This function converts datetime string (with timezone info) to Beijing Time for display.
const formatInBeijingTime = (datetime: string, symbol: string) => {
  return formatDateTimeInBeijing(datetime, 'full');
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
