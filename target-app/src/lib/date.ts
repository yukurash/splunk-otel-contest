/**
 * Returns a "YYYY-MM-DD" string based on local time, not UTC.
 * Using local time avoids off-by-one errors for users in non-UTC timezones.
 */
export function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
