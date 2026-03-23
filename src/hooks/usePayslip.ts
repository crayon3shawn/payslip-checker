import { useState, useEffect, useMemo } from 'react';
import { type DailyRecord, getResults, type EmploymentType } from '../utils/calculator';
import { AWARDS, getAwardById, DEFAULT_AWARD_ID, type AwardConfig } from '../data/awards';

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
  const [selectedAwardId, setSelectedAwardId] = useState<string>(() =>
    localStorage.getItem('selectedAwardId') ?? DEFAULT_AWARD_ID
  );

  const award: AwardConfig = useMemo(
    () => getAwardById(selectedAwardId) ?? AWARDS[0],
    [selectedAwardId]
  );

  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('hourlyRate');
    return saved ? parseFloat(saved) : award.defaultHourlyRate;
  });

  const [empType, setEmpType] = useState<EmploymentType>(() =>
    (localStorage.getItem('empType') as EmploymentType) ?? 'casual'
  );

  const getDefaultRecords = (a: AwardConfig): UIRecord[] =>
    INITIAL_DAYS.map((d) => ({
      id: d.id, day: d.en, dayCn: d.cn,
      enabled: d.id <= 5,
      startTime: a.defaultStartTime,
      endTime: a.defaultEndTime,
      breakMinutes: a.defaultBreakMinutes,
      isHoliday: false,
    }));

  const [records, setRecords] = useState<UIRecord[]>(() => {
    const saved = localStorage.getItem('payslipRecords');
    if (saved) return JSON.parse(saved);
    return getDefaultRecords(award);
  });

  useEffect(() => {
    localStorage.setItem('selectedAwardId', selectedAwardId);
  }, [selectedAwardId]);

  useEffect(() => {
    localStorage.setItem('hourlyRate', hourlyRate.toString());
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem('empType', empType);
  }, [empType]);

  useEffect(() => {
    localStorage.setItem('payslipRecords', JSON.stringify(records));
  }, [records]);

  const updateRecord = <K extends keyof UIRecord>(id: number, field: K, value: UIRecord[K]) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const resetAllData = () => {
    setHourlyRate(award.defaultHourlyRate);
    setEmpType('casual');
    setRecords(getDefaultRecords(award));
  };

  const dailyLimit = useMemo(() => {
    const enabledDaysCount = records.filter(r => r.enabled && r.id <= 5).length;
    if (enabledDaysCount === 0) return award.weeklyStandardHours / 5;
    return Math.round((award.weeklyStandardHours / enabledDaysCount) * 100) / 100;
  }, [records, award]);

  const results = useMemo(
    () => getResults(records, hourlyRate, empType, dailyLimit, award),
    [records, hourlyRate, empType, dailyLimit, award]
  );

  return {
    award, selectedAwardId, setSelectedAwardId,
    hourlyRate, setHourlyRate,
    empType, setEmpType,
    records, updateRecord,
    results, dailyLimit,
    resetAllData,
  };
}
