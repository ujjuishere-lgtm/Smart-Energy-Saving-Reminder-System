import { describe, expect, it } from 'vitest';
import {
  calculateFlatBill, calculateGoalProgress, calculateSlabBill, createDemoData,
  getRecommendations, sumKwh, validateEnergyRecord, validateReminder,
} from '../src/logic';

describe('electricity cost calculations', () => {
  it('calculates flat-rate charges with fixed and additional amounts', () => {
    expect(calculateFlatBill(128, 8.5, 50, 12)).toBe(1150);
  });
  it('accepts zero consumption and rate', () => {
    expect(calculateFlatBill(0, 0, 0, 0)).toBe(0);
  });
  it('rejects negative and non-finite values', () => {
    expect(() => calculateFlatBill(-1, 8)).toThrow();
    expect(() => calculateFlatBill(2, Number.NaN)).toThrow();
  });
  it('calculates progressive slab rates per band', () => {
    expect(calculateSlabBill(250, [
      { upTo: 100, rate: 3 }, { upTo: 200, rate: 5 }, { upTo: null, rate: 8 },
    ], 20, 5)).toBe(1225);
  });
  it('rejects invalid slab thresholds and missing final band', () => {
    expect(() => calculateSlabBill(300, [{ upTo: 100, rate: 3 }])).toThrow();
    expect(() => calculateSlabBill(3, [{ upTo: 100, rate: 3 }, { upTo: 100, rate: 4 }, { upTo: null, rate: 5 }])).toThrow();
  });
});

describe('energy readings and goals', () => {
  it('validates consumption values', () => {
    expect(validateEnergyRecord('2026-10-22', 2)).toBeNull();
    expect(validateEnergyRecord('2026-10-22', 0)).toContain('greater than 0');
    expect(validateEnergyRecord('', 2)).toContain('date');
    expect(validateEnergyRecord('2026-10-22', -1)).toContain('greater than 0');
  });
  it('returns null progress for zero baseline and safe percentages otherwise', () => {
    expect(calculateGoalProgress(0, 10, 20).progressPercent).toBeNull();
    expect(calculateGoalProgress(100, 20, 70)).toMatchObject({ targetKwh: 80, progressPercent: 100, remainingKwh: 0 });
    expect(calculateGoalProgress(100, 20, 90)).toMatchObject({ targetKwh: 80, progressPercent: 0, remainingKwh: 10 });
    expect(calculateGoalProgress(100, 20, 0).progressPercent).toBe(100);
  });
  it('does not show unsupported personalised saving claims and provides beginner guidance', () => {
    expect(getRecommendations([])[0].title).toContain('first electricity reading');
    expect(getRecommendations(createDemoData().records)[0].measure.length).toBeGreaterThan(5);
  });
  it('sums supplied records', () => {
    expect(sumKwh(createDemoData().records)).toBeCloseTo(115.4, 5);
  });
  it('validates reminder title and schedule', () => {
    expect(validateReminder('Turn off lights', '2026-10-22T18:00')).toBeNull();
    expect(validateReminder('   ', '2026-10-22T18:00')).toContain('title');
    expect(validateReminder('Reminder', '')).toContain('date and time');
  });
});
