import type { AppData, EnergyRecord, Reminder, Recurrence } from './types';

export const STORAGE_KEY = 'smart-energy-system-v1';
export const DEFAULT_SETTINGS = {
  rate: 8.5,
  fixedCharges: 0,
  extraCharges: 0,
  // Explicit illustrative value only; users must configure a sourced factor for meaningful results.
  carbonKgPerKwh: 0,
  carbonFactorSource: '',
  useDemoData: true,
};

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function dateDaysAgo(daysAgo: number, reference = new Date()): string {
  const date = new Date(reference);
  date.setDate(date.getDate() - daysAgo);
  return localDate(date);
}

export function createDemoData(reference = new Date()): AppData {
  const daily = [14.2, 16.8, 13.6, 18.1, 15.4, 20.2, 17.1];
  const records: EnergyRecord[] = daily.map((kwh, i) => ({
    id: `demo-${i}`,
    date: dateDaysAgo(6 - i, reference),
    kwh,
    category: (['Appliances', 'Cooling', 'Lighting', 'Appliances', 'Laundry', 'Cooling', 'Other'] as const)[i],
    note: 'Illustrative sample only',
    source: 'demo',
  }));
  const today = new Date(reference);
  today.setHours(18, 0, 0, 0);
  const tomorrow = new Date(reference);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  const reminders: Reminder[] = [
    { id: 'r-demo-1', title: 'Switch off unused lights', category: 'Lighting', dueAt: `${localDate(today)}T${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`, recurrence: 'Daily', completed: false, createdAt: reference.toISOString() },
    { id: 'r-demo-2', title: 'Review cooling settings', category: 'Cooling', dueAt: `${localDate(tomorrow)}T${String(tomorrow.getHours()).padStart(2, '0')}:${String(tomorrow.getMinutes()).padStart(2, '0')}`, recurrence: 'Weekly', completed: false, createdAt: reference.toISOString() },
    { id: 'r-demo-3', title: 'Check standby appliances', category: 'Standby power', dueAt: `${localDate(today)}T${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`, recurrence: 'None', completed: true, createdAt: reference.toISOString() },
  ];
  const monthAgo = new Date(reference.getFullYear(), reference.getMonth(), 1);
  return {
    records,
    reminders,
    goal: { baselineKwh: 420, reductionPercent: 10, baselineMonth: `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}` },
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (!Array.isArray(parsed.records) || !Array.isArray(parsed.reminders) || !parsed.goal || !parsed.settings) return createDemoData();
    return {
      records: parsed.records,
      reminders: parsed.reminders,
      goal: parsed.goal,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return createDemoData();
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function sumKwh(records: EnergyRecord[]): number {
  return records.reduce((sum, record) => sum + record.kwh, 0);
}

export function monthRecords(records: EnergyRecord[], month: string): EnergyRecord[] {
  return records.filter((record) => record.date.startsWith(month));
}

export function weekRecords(records: EnergyRecord[], reference = new Date()): EnergyRecord[] {
  const today = localDate(reference);
  const start = new Date(reference);
  start.setDate(start.getDate() - 6);
  const lower = localDate(start);
  return records.filter((record) => record.date >= lower && record.date <= today);
}

export function calculateFlatBill(consumption: number, rate: number, fixedCharges = 0, additionalCharges = 0): number {
  const values = [consumption, rate, fixedCharges, additionalCharges];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Enter valid non-negative numbers for every bill input.');
  return consumption * rate + fixedCharges + additionalCharges;
}

export interface Slab { upTo: number | null; rate: number }
export function calculateSlabBill(consumption: number, slabs: Slab[], fixedCharges = 0, additionalCharges = 0): number {
  if (!Number.isFinite(consumption) || consumption < 0 || !Number.isFinite(fixedCharges) || fixedCharges < 0 || !Number.isFinite(additionalCharges) || additionalCharges < 0) {
    throw new Error('Enter valid non-negative numbers for every bill input.');
  }
  if (!slabs.length || slabs.some((slab) => (slab.upTo !== null && (!Number.isFinite(slab.upTo) || slab.upTo <= 0)) || !Number.isFinite(slab.rate) || slab.rate < 0)) {
    throw new Error('Configure valid consumption bands and non-negative slab rates.');
  }
  let previousThreshold = 0;
  for (let i = 0; i < slabs.length; i += 1) {
    const threshold = slabs[i].upTo;
    if (threshold === null && i !== slabs.length - 1) throw new Error('The unlimited slab must be the final band.');
    if (threshold !== null) {
      if (threshold <= previousThreshold) throw new Error('Slab thresholds must be in strictly ascending order.');
      previousThreshold = threshold;
    }
  }
  let lower = 0;
  let remaining = consumption;
  let energyCost = 0;
  let hasUnlimited = false;
  for (const slab of slabs) {
    if (slab.upTo === null) {
      hasUnlimited = true;
      energyCost += remaining * slab.rate;
      remaining = 0;
      break;
    }
    if (slab.upTo <= lower) throw new Error('Slab thresholds must be in strictly ascending order.');
    const span = slab.upTo - lower;
    const unitsInSlab = Math.min(Math.max(remaining, 0), span);
    energyCost += unitsInSlab * slab.rate;
    remaining -= unitsInSlab;
    lower = slab.upTo;
    if (remaining <= 0) break;
  }
  if (remaining > 0 && !hasUnlimited) throw new Error('Add a final unlimited slab to cover all units consumed.');
  return energyCost + fixedCharges + additionalCharges;
}

export function calculateGoalProgress(baselineKwh: number, reductionPercent: number, currentKwh: number): {
  targetKwh: number | null; progressPercent: number | null; remainingKwh: number | null; reductionPercentActual: number | null;
} {
  if (![baselineKwh, reductionPercent, currentKwh].every(Number.isFinite) || baselineKwh <= 0 || reductionPercent < 0 || reductionPercent > 100 || currentKwh < 0) {
    return { targetKwh: null, progressPercent: null, remainingKwh: null, reductionPercentActual: null };
  }
  const targetKwh = baselineKwh * (1 - reductionPercent / 100);
  const reduction = baselineKwh - currentKwh;
  const desiredReduction = baselineKwh - targetKwh;
  const progressPercent = desiredReduction === 0
    ? (currentKwh <= targetKwh ? 100 : 0)
    : currentKwh <= targetKwh
      ? 100
      : Math.min(100, Math.max(0, (reduction / desiredReduction) * 100));
  return {
    targetKwh,
    progressPercent,
    remainingKwh: Math.max(0, currentKwh - targetKwh),
    reductionPercentActual: (reduction / baselineKwh) * 100,
  };
}

export function validateEnergyRecord(date: string, kwh: number): string | null {
  if (!date || Number.isNaN(Date.parse(`${date}T00:00:00`))) return 'Choose a valid date.';
  if (!Number.isFinite(kwh) || kwh <= 0) return 'Consumption must be greater than 0 kWh.';
  if (kwh > 100000) return 'That value is unusually high. Check the number and try again.';
  return null;
}

export function validateReminder(title: string, dueAt: string): string | null {
  if (!title.trim()) return 'Enter a reminder title.';
  if (title.trim().length > 90) return 'Reminder titles must be 90 characters or fewer.';
  if (!dueAt || Number.isNaN(Date.parse(dueAt))) return 'Choose a valid reminder date and time.';
  return null;
}

export function nextOccurrence(reminder: Reminder): string | null {
  const next = new Date(reminder.dueAt);
  if (Number.isNaN(next.getTime())) return null;
  switch (reminder.recurrence as Recurrence) {
    case 'Daily': next.setDate(next.getDate() + 1); break;
    case 'Weekly': next.setDate(next.getDate() + 7); break;
    case 'Monthly': next.setMonth(next.getMonth() + 1); break;
    default: return null;
  }
  return `${localDate(next)}T${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
}

export function getRecommendations(records: EnergyRecord[]): { title: string; why: string; when: string; measure: string; category: string }[] {
  if (records.length === 0) return [{
    title: 'Add your first electricity reading', why: 'Recommendations become more useful when there is real usage data to compare.', when: 'Today', measure: 'Enter a dated kWh reading and compare the next 7 days.', category: 'Getting started',
  }];
  const categories = new Map<string, number>();
  records.forEach((record) => categories.set(record.category, (categories.get(record.category) ?? 0) + record.kwh));
  const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const tips = [
    { title: 'Switch off lights in empty rooms', why: 'Lighting used unnecessarily adds to consumption.', when: 'When leaving a room', measure: 'Compare lighting-category readings over two similar weeks.', category: 'Lighting' },
    { title: 'Review cooling settings and filters', why: 'Appropriate set-points and clean filters can help avoid needless cooling demand.', when: 'Before the next long cooling session', measure: 'Compare cooling-category kWh across comparable days.', category: 'Cooling' },
    { title: 'Check standby devices', why: 'Some devices continue to draw power while idle.', when: 'During an evening room-by-room check', measure: 'Record standby-related usage before and after changing habits.', category: 'Standby power' },
    { title: 'Run full appliance loads where appropriate', why: 'Avoids repeating cycles for small loads when safe and suitable.', when: 'Before starting laundry or a dishwasher', measure: 'Compare appliance-category usage per week.', category: 'Appliances' },
  ];
  const chosen = tips.find((tip) => tip.category === topCategory);
  return chosen ? [chosen, ...tips.filter((tip) => tip !== chosen).slice(0, 2)] : tips.slice(0, 3);
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function safeJsonExport(data: AppData): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), project: 'Smart Energy Saving Reminder System', data }, null, 2);
}
