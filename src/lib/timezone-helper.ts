// A map from symbol prefixes to IANA timezone names
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
 */
export function getTimezoneForSymbol(symbol: string): string {
  // Find a key in the map that is a prefix of the symbol
  const matchingKey = Object.keys(symbolTimezoneMap).find(prefix => symbol.startsWith(prefix));
  
  return matchingKey ? symbolTimezoneMap[matchingKey] : DEFAULT_TIMEZONE;
}
