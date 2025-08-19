// A map from symbol prefixes to IANA timezone names
// Note: This is now mainly for reference/documentation purposes
// since datetime fields in DynamoDB already contain timezone information
const symbolTimezoneMap: { [key: string]: string } = {
  MES: "America/Chicago", // CME Group, Chicago
  N225MC: "Asia/Tokyo",    // Osaka Exchange, Japan
  // Add other symbol prefixes and their timezones here
  // e.g., 'DAX': 'Europe/Berlin' for Eurex
};

// Default timezone if no specific match is found
const DEFAULT_TIMEZONE = "UTC";

/**
 * Gets the IANA timezone name for a given trading symbol.
 * @param symbol The trading symbol (e.g., "MESU24", "N225MC.OS").
 * @returns The corresponding IANA timezone name (e.g., "America/Chicago").
 * @deprecated This function is deprecated since datetime fields now contain timezone info directly
 */
export function getTimezoneForSymbol(symbol: string): string {
  // Find a key in the map that is a prefix of the symbol
  const matchingKey = Object.keys(symbolTimezoneMap).find(prefix => symbol.startsWith(prefix));
  
  return matchingKey ? symbolTimezoneMap[matchingKey] : DEFAULT_TIMEZONE;
}

/**
 * Convert a datetime string (with timezone info) to Beijing time format
 * @param datetime ISO 8601 datetime string with timezone info
 * @param format Output format string
 * @returns Formatted datetime string in Beijing timezone
 */
export function formatDateTimeInBeijing(datetime: string, format: 'full' | 'time-only' = 'full'): string {
  try {
    const date = new Date(datetime);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid datetime format: ${datetime}`);
      return datetime;
    }
    
    const beijingTimeZone = "Asia/Shanghai";
    const options: Intl.DateTimeFormatOptions = {
      timeZone: beijingTimeZone,
      ...(format === 'full' 
        ? {
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }
        : {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }
      )
    };
    
    const formatter = new Intl.DateTimeFormat('zh-CN', options);
    return formatter.format(date);
  } catch (error) {
    console.error(`Error parsing datetime: ${datetime}`, error);
    return datetime;
  }
}
