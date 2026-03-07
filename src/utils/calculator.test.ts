import { describe, it, expect } from 'vitest';
import { getResults, type DailyRecord } from './calculator';

describe('AU Payslip Calculator Logic', () => {
  const hourlyRate = 30;

  it('calculates standard 7.5h day correctly (Ordinary)', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '17:00', unpaidBreak: true, isHoliday: false
    }];
    const res = getResults(records, hourlyRate);
    expect(res.totalOrdinaryHours).toBe(7.5);
    expect(res.totalOT15xHours).toBe(0);
    expect(res.grossPay).toBe(7.5 * 30);
  });

  it('calculates overtime correctly (> 7.6h)', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '08:00', endTime: '18:00', unpaidBreak: true, isHoliday: false
    }];
    const res = getResults(records, hourlyRate);
    // 10h total - 0.5h break = 9.5h net
    // 7.6h Ordinary, 1.9h Overtime
    expect(res.totalOrdinaryHours).toBe(7.6);
    expect(res.totalOT15xHours).toBe(1.9);
    expect(res.grossPay).toBe((7.6 * 30) + (1.9 * 30 * 1.5));
  });

  it('calculates public holidays at 2x correctly', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '09:00', endTime: '17:00', unpaidBreak: true, isHoliday: true
    }];
    const res = getResults(records, hourlyRate);
    expect(res.totalHolidayHours).toBe(7.5);
    expect(res.grossPay).toBe(7.5 * 30 * 2.0);
  });

  it('handles overnight shifts correctly', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: true, startTime: '22:00', endTime: '02:00', unpaidBreak: false, isHoliday: false
    }];
    const res = getResults(records, hourlyRate);
    expect(res.totalOrdinaryHours).toBe(4);
    expect(res.grossPay).toBe(4 * 30);
  });

  it('ignores disabled days', () => {
    const records: DailyRecord[] = [{
      id: 1, enabled: false, startTime: '09:00', endTime: '17:00', unpaidBreak: true, isHoliday: false
    }];
    const res = getResults(records, hourlyRate);
    expect(res.grossPay).toBe(0);
  });
});
