import { describe, it, expect } from 'vitest';
import { getResults, type DailyRecord } from './calculator';
import { type AwardConfig } from '../data/awards';

// A mock award matching GMP EA rates for all existing tests
const GMP_EA_MOCK: AwardConfig = {
  id: 'gmp-ea', name: 'GMP EA', shortName: 'GMP EA', isCustomEA: true,
  satOT1Multiplier: 1.5, satOT1LimitHours: 3.0, satOT2Multiplier: 2.0,
  sunMultiplier: 2.0, sunMinHours: 4.0, phMultiplier: 2.0,
  weekdayOT1Multiplier: 1.5, weekdayOT1LimitHours: 3.0, weekdayOT2Multiplier: 2.0,
  casualLoading: 0.25, superRate: 0.12,
  minEngagementHours: 3.0, weeklyStandardHours: 38,
  defaultHourlyRate: 32.15, defaultStartTime: '06:00', defaultEndTime: '16:00', defaultBreakMinutes: 30,
  breakRules: [], classifications: [],
};

describe('AU Payslip Calculator Logic', () => {
  const casualRate = 31.19;
  const baseRate = 24.952; // 31.19 / 1.25
  const defaultDailyLimit = 7.6;

  it('applies min engagement (3.0h) for short shifts', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '10:00', breakMinutes: 0, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalOrdinary).toBe(3.0);
    expect(res.payOrdinary).toBeCloseTo(3.0 * casualRate, 2);
  });

  it('calculates weekday overtime correctly', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '08:00', endTime: '18:00', breakMinutes: 30, isHoliday: false
    }];
    // 9.5h net: 7.6 ordinary + 1.9 OT
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalOrdinary).toBe(7.6);
    expect(res.totalOT15).toBe(1.9);
    expect(res.payOrdinary).toBeCloseTo(7.6 * casualRate, 2);
    expect(res.payOT15).toBeCloseTo(1.9 * baseRate * 1.5, 2);
  });

  it('handles custom min engagement (2.0h)', () => {
    const award = { ...GMP_EA_MOCK, minEngagementHours: 2.0 };
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '10:00', breakMinutes: 0, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, award);
    expect(res.totalOrdinary).toBe(2.0);
  });

  it('applies Sunday minimum 4h guarantee', () => {
    const records: DailyRecord[] = [{
      id: 7, enabled: true, startTime: '09:00', endTime: '11:00', breakMinutes: 0, isHoliday: false
    }];
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalHoliday).toBe(4.0);
    expect(res.payHoliday).toBeCloseTo(4.0 * baseRate * 2.0, 2);
  });

  it('calculates GMP EA Saturday tiers (3h 1.5x then 2.0x)', () => {
    const records: DailyRecord[] = [{
      id: 6, enabled: true, startTime: '09:00', endTime: '14:00', breakMinutes: 0, isHoliday: false
    }];
    // 5h: 3h @ 1.5x, 2h @ 2.0x
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, GMP_EA_MOCK);
    expect(res.totalOT15).toBe(3.0);
    expect(res.totalOT20).toBe(2.0);
  });

  it('calculates flat Saturday rate when satOT1LimitHours = 0', () => {
    const meatAward = { ...GMP_EA_MOCK, satOT1LimitHours: 0, satOT1Multiplier: 1.5 };
    const records: DailyRecord[] = [{
      id: 6, enabled: true, startTime: '09:00', endTime: '14:00', breakMinutes: 0, isHoliday: false
    }];
    // 5h all at 1.5x, no 2.0x tier
    const res = getResults(records, casualRate, 'casual', defaultDailyLimit, meatAward);
    expect(res.totalOT15).toBe(5.0);
    expect(res.totalOT20).toBe(0);
  });
});
