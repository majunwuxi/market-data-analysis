import { z } from 'zod';

export const MarketDataSchema = z.object({
  timestamp: z.number(),
  datetime: z.string(), // e.g., "2025-07-14T18:00:00"
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export type MarketData = z.infer<typeof MarketDataSchema>;
