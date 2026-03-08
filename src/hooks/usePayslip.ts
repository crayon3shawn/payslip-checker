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

  const [empType, setEmpType] = useState<EmploymentType>(() => {
    const saved = localStorage.getItem('empType');
    return (saved as EmploymentType) || 'casual';
  });

  const [records, setRecords] = useState<UIRecord[]>(() => {
    const saved = localStorage.getItem('payslipRecords');
    if (saved) return JSON.parse(saved);
    
    return INITIAL_DAYS.map((d) => ({
      id: d.id,
      day: d.en,
      dayCn: d.cn,
      enabled: d.id <= 5,
      startTime: '09:00',
      endTime: '17:00',
      unpaidBreak: true,
      isHoliday: false,
    }));
  });

  useEffect(() => {
    localStorage.setItem('hourlyRate', hourlyRate.toString());
    localStorage.setItem('empType', empType);
  }, [hourlyRate, empType]);

  useEffect(() => {
    localStorage.setItem('payslipRecords', JSON.stringify(records));
  }, [records]);

  const updateRecord = (id: number, field: keyof UIRecord, value: any) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Calculate dynamic daily limit based on enabled days (excluding weekends for the 38h division)
  const dailyLimit = useMemo(() => {
    const enabledDaysCount = records.filter(r => r.enabled && r.id <= 5).length;
    if (enabledDaysCount === 0) return 7.6;
    return Math.round((AU_REGS.WEEKLY_STANDARD_HOURS / enabledDaysCount) * 100) / 100;
  }, [records]);

  const results = useMemo(() => 
    getResults(records, hourlyRate, empType, dailyLimit), 
    [records, hourlyRate, empType, dailyLimit]
  );

  return {
    hourlyRate,
    setHourlyRate,
    empType,
    setEmpType,
    records,
    updateRecord,
    results,
    dailyLimit
  };
}
