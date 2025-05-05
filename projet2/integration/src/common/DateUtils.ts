/**
 * DateUtils.ts
 * Utility functions for standardized date formatting across all adapters
 */

/**
 * Formats a Date object into a standard YYYY-MM-DD format
 * @param date The date object to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Formats a Date object into a standard YYYY-MM-DD HH:mm:ss format
 * @param date The date object to format
 * @returns Formatted date-time string in YYYY-MM-DD HH:mm:ss format
 */
export function formatDateTime(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return `${formatDate(d)} ${d.toTimeString().split(' ')[0]}`;
}

/**
 * Parses a date string in various formats into a Date object
 * @param dateStr The date string to parse
 * @returns A Date object
 */
export function parseDate(dateStr: string): Date {
  // Handle different possible date formats
  if (!dateStr) {
    return new Date();
  }
  
  // Try parsing using Date constructor
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // If standard parsing fails, try custom formats
  const formats = [
    // DD/MM/YYYY
    {
      regex: /^(\d{2})\/(\d{2})\/(\d{4})$/,
      parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
    },
    // YYYY-MM-DD
    {
      regex: /^(\d{4})-(\d{2})-(\d{2})$/,
      parse: (m: RegExpMatchArray) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
    }
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format.regex);
    if (match) {
      return format.parse(match);
    }
  }
  
  // Default to current date if parsing fails
  console.warn(`Failed to parse date string: ${dateStr}, using current date`);
  return new Date();
}