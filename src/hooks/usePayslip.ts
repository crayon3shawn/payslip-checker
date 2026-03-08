import { useState, useEffect, useMemo } from 'react';
import { type DailyRecord, getResults, type EmploymentType } from '../utils/calculator';
import { AU_REGS } from '../constants/regulations';

const INITIAL_DAYS = [
  { id: 1, en: 'Mon', cn: '週一' },
  { id: 2, en: 'Tue', cn: '週二' },
  { id: 3, en: 'Wed', cn: '週三' },
  { id: 4, en: 'Thu', cn: '週四' },
  { id: 5, en: 'Fri', cn: '週五' },
  { id: 6, en: 'Sat', cn: '週六' },
  { id: 7, en: 'Sun', cn: '週日' },
];

export interface UIRecord extends DailyRecord {
  day: string;
  dayCn: string;
}

export function usePayslip() {
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('hourlyRate');
    return saved ? parseFloat(saved) : AU_REGS.DEFAULT_HOURLY_RATE;
  });

  const [minEngagement, setMinEngagement] = useState<number>(() => {
    const saved = localStorage.getItem('minEngagement');
    return saved ? parseFloat(saved) : AU_REGS.MIN_ENGAGEMENT_HOURS;
  });

  const [empType, setEmpType] = useState<EmploymentType>(() => {
    const saved = localStorage.getItem('empType');
    return (saved as EmploymentType) || 'casual';
  });

  const getDefaultRecords = (): UIRecord[] => INITIAL_DAYS.map((d) => ({
    id: d.id,
    day: d.en,
    dayCn: d.cn,
    enabled: d.id <= 5,
    startTime: AU_REGS.DEFAULT_START,
    endTime: AU_REGS.DEFAULT_END,
    breakMinutes: AU_REGS.UNPAID_BREAK_DURATION,
    isHoliday: false,
  }));

  const [records, setRecords] = useState<UIRecord[]>(() => {
    const saved = localStorage.getItem('payslipRecords');
    if (saved) return JSON.parse(saved);
    return getDefaultRecords();
  });

  useEffect(() => {
    localStorage.setItem('hourlyRate', hourlyRate.toString());
    localStorage.setItem('minEngagement', minEngagement.toString());
    localStorage.setItem('empType', empType);
  }, [hourlyRate, minEngagement, empType]);

  useEffect(() => {
    localStorage.setItem('payslipRecords', JSON.stringify(records));
  }, [records]);

  const updateRecord = <K extends keyof UIRecord>(id: number, field: K, value: UIRecord[K]) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const resetAllData = () => {
    setHourlyRate(AU_REGS.DEFAULT_HOURLY_RATE);
    setMinEngagement(AU_REGS.MIN_ENGAGEMENT_HOURS);
    setEmpType('casual');
    setRecords(getDefaultRecords());
  };

  // Calculate dynamic daily limit based on enabled days (excluding weekends for the 38h division)
  const dailyLimit = useMemo(() => {
    const enabledDaysCount = records.filter(r => r.enabled && r.id <= 5).length;
    if (enabledDaysCount === 0) return 7.6;
    return Math.round((AU_REGS.WEEKLY_STANDARD_HOURS / enabledDaysCount) * 100) / 100;
  }, [records]);

  const results = useMemo(() => 
    getResults(records, hourlyRate, empType, dailyLimit, minEngagement), 
    [records, hourlyRate, empType, dailyLimit, minEngagement]
  );

  return {
    hourlyRate,
    setHourlyRate,
    minEngagement,
    setMinEngagement,
    empType,
    setEmpType,
    records,
    updateRecord,
    results,
    dailyLimit,
    resetAllData
  };
}
