import { describe, it, expect } from 'vitest';
import { getResults, type DailyRecord } from './calculator';

describe('AU Payslip Calculator Logic (v1.6.2)', () => {
  const casualRate = 31.19; 
  const baseRate = 24.952; // 31.19 / 1.25
  const defaultDailyLimit = 7.6;
  const awardMin = 3.0;

  it('applies Award Minimum Hour (3.0h) for short shifts', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '10:00', breakMinutes: 0, isHoliday: false
    }];
    // 1h worked, but Award Min is 3.0h
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, awardMin);
    
    expect(res.totalOrdinary).toBe(3.0);
    expect(res.payOrdinary).toBeCloseTo(3.0 * casualRate, 2);
  });

  it('calculates individual pay categories correctly for Overtime', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '08:00', endTime: '18:00', breakMinutes: 30, isHoliday: false
    }];
    // 10h total - 30m break = 9.5h net
    // Ordinary: 7.6h ($31.19/h = $237.04)
    // OT 1.5x: 1.9h ($24.952 * 1.5 = $37.43/h = $71.12)
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, awardMin);
    
    expect(res.totalOrdinary).toBe(7.6);
    expect(res.totalOT15).toBe(1.9);
    
    expect(res.payOrdinary).toBeCloseTo(7.6 * casualRate, 2);
    expect(res.payOT15).toBeCloseTo(1.9 * baseRate * 1.5, 2);
    expect(res.grossPay).toBeCloseTo(res.payOrdinary + res.payOT15, 2);
  });

  it('handles custom Award Minimum (e.g. 2.0h) correctly', () => {
    const customMin = 2.0;
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '10:00', breakMinutes: 0, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, customMin);
    
    expect(res.totalOrdinary).toBe(2.0);
  });

  it('applies Sunday minimum 4h guarantee (Industry standard)', () => {
    const records: DailyRecord[] = [{
      id: 7, enabled: true, startTime: '09:00', endTime: '11:00', breakMinutes: 0, isHoliday: false
    }];
    // 2h worked, but Sunday guarantee is 4.0h
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, awardMin);
    
    expect(res.totalHoliday).toBe(4.0);
    expect(res.payHoliday).toBeCloseTo(4.0 * baseRate * 2.0, 2);
  });

  it('calculates Saturday tiers correctly (3h 1.5x, then 2.0x)', () => {
    const records: DailyRecord[] = [{
      id: 6, enabled: true, startTime: '09:00', endTime: '14:00', breakMinutes: 0, isHoliday: false
    }];
    // 5h total
    // OT 1.5x: 3.0h
    // OT 2.0x: 2.0h
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, awardMin);
    
    expect(res.totalOT15).toBe(3.0);
    expect(res.totalOT20).toBe(2.0);
    expect(res.payOT15).toBeCloseTo(3.0 * baseRate * 1.5, 2);
    expect(res.payOT20).toBeCloseTo(2.0 * baseRate * 2.0, 2);
  });
});
