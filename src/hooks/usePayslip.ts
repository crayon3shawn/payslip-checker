import { useState, useEffect, useMemo } from 'react';
import { type DailyRecord, getResults } from '../utils/calculator';
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
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem('payslipRecords', JSON.stringify(records));
  }, [records]);

  const updateRecord = (id: number, field: keyof UIRecord, value: any) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Performance optimization using useMemo
  const results = useMemo(() => getResults(records, hourlyRate), [records, hourlyRate]);

  return {
    hourlyRate,
    setHourlyRate,
    records,
    updateRecord,
    results
  };
}
