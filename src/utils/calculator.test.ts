import { describe, it, expect } from 'vitest';
import { getResults, type DailyRecord } from './calculator';

describe('AU Payslip Calculator Logic (Pro Version)', () => {
  const casualRate = 31.19; // Base would be 24.952
  const baseRate = 24.95;

  it('calculates Casual Weekday OT correctly (Base * 1.5)', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '08:00', endTime: '18:00', unpaidBreak: true, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual');
    // 10h total - 0.5h break = 9.5h net
    // 7.6h Ordinary ($31.19), 1.9h OT ($24.95 * 1.5 = $37.43)
    expect(res.totalOrdinary).toBe(7.6);
    expect(res.totalOT15).toBe(1.9);
    const expectedPay = (7.6 * 31.19) + (1.9 * 24.952 * 1.5);
    expect(res.grossPay).toBeCloseTo(expectedPay, 1);
  });

  it('calculates Saturday ladder correctly (3h 1.5x, then 2x)', () => {
    const records: DailyRecord[] = [{
      id: 6, enabled: true, startTime: '09:00', endTime: '14:00', unpaidBreak: false, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual');
    // 5h total
    // Sat: 3h @ 1.5x, 2h @ 2x
    expect(res.totalOT15).toBe(3);
    expect(res.totalOT20).toBe(2);
  });

  it('applies Sunday minimum 4h guarantee', () => {
    const records: DailyRecord[] = [{
      id: 7, enabled: true, startTime: '09:00', endTime: '11:00', unpaidBreak: false, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual');
    // 2h worked, but should pay 4h
    expect(res.totalHoliday).toBe(4);
    expect(res.grossPay).toBeCloseTo(4 * 24.952 * 2, 1);
  });

  it('calculates Public Holiday at 2x correctly', () => {
    const records: DailyRecord[] = [{
      id: 3, enabled: true, startTime: '09:00', endTime: '17:00', unpaidBreak: true, isHoliday: true
    }];
    const res = getResults(records, casualRate, 'casual');
    // 7.5h @ 2x base
    expect(res.totalHoliday).toBe(7.5);
    expect(res.grossPay).toBeCloseTo(7.5 * 24.952 * 2, 1);
  });
});
