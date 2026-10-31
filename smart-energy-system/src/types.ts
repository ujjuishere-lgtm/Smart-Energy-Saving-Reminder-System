export type Category = 'Lighting' | 'Cooling' | 'Appliances' | 'Standby power' | 'Laundry' | 'Other';
export type Recurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly';
export interface EnergyRecord {
  id: string;
  date: string;
  kwh: number;
  category: Category;
  note: string;
  source: 'user' | 'demo';
}
export interface Reminder {
  id: string;
  title: string;
  category: Category;
  dueAt: string;
  recurrence: Recurrence;
  completed: boolean;
  createdAt: string;
}
export interface Goal {
  baselineKwh: number;
  reductionPercent: number;
  baselineMonth: string;
}
export interface Settings {
  rate: number;
  fixedCharges: number;
  extraCharges: number;
  carbonKgPerKwh: number;
  carbonFactorSource: string;
  useDemoData: boolean;
}
export interface AppData {
  records: EnergyRecord[];
  reminders: Reminder[];
  goal: Goal;
  settings: Settings;
}
