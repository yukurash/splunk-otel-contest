export interface Habit {
  id: string;
  name: string;
  completedDates: string[]; // "YYYY-MM-DD" 形式のISO日付
}
