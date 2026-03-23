import { type AwardConfig } from '../data/awards';

export interface DailyRecord {
  id: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isHoliday: boolean;
}

export type EmploymentType = 'permanent' | 'casual';

export const calculateHours = (start: string, end: string) => {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH + eM / 60) - (sH + sM / 60);
  if (diff < 0) diff += 24;
  return diff;
};

export interface DailyBreakdown {
  id: number;
  totalHours: number;
  ordHours: number;
  otHours: number;
  holHours: number;
}

export const getResults = (
  records: DailyRecord[],
  hourlyRate: number,
  empType: EmploymentType,
  dailyLimit: number,
  award: AwardConfig,
) => {
  const baseRate = empType === 'casual'
    ? hourlyRate / (1 + award.casualLoading)
    : hourlyRate;

  let summary = {
    totalOrdinary: 0, totalOT15: 0, totalOT20: 0, totalHoliday: 0,
    payOrdinary: 0, payOT15: 0, payOT20: 0, payHoliday: 0,
  };

  const dailyBreakdown: DailyBreakdown[] = [];

  records.filter(r => r.enabled).forEach(r => {
    const dailyGross = calculateHours(r.startTime, r.endTime);
    let netHours = Math.max(0, dailyGross - (r.breakMinutes / 60));

    if (netHours > 0) {
      netHours = Math.max(netHours, award.minEngagementHours);
    }

    let ord = 0, ot15 = 0, ot20 = 0, hol = 0;
    const dayIndex = r.id; // 1=Mon, 6=Sat, 7=Sun

    if (r.isHoliday) {
      hol = netHours;
      summary.payHoliday += hol * baseRate * award.phMultiplier;
    } else if (dayIndex === 7) {
      hol = Math.max(netHours, award.sunMinHours);
      summary.payHoliday += hol * baseRate * award.sunMultiplier;
    } else if (dayIndex === 6) {
      if (award.satOT1LimitHours === 0) {
        // Flat Saturday rate — all hours at satOT1Multiplier
        ot15 = netHours;
        summary.payOT15 += ot15 * baseRate * award.satOT1Multiplier;
      } else {
        ot15 = Math.min(netHours, award.satOT1LimitHours);
        ot20 = Math.max(0, netHours - award.satOT1LimitHours);
        summary.payOT15 += ot15 * baseRate * award.satOT1Multiplier;
        summary.payOT20 += ot20 * baseRate * award.satOT2Multiplier;
      }
    } else {
      ord = Math.min(netHours, dailyLimit);
      const remaining = Math.max(0, netHours - dailyLimit);
      ot15 = Math.min(remaining, award.weekdayOT1LimitHours);
      ot20 = Math.max(0, remaining - award.weekdayOT1LimitHours);

      const ordRate = empType === 'casual' ? hourlyRate : baseRate;
      summary.payOrdinary += ord * ordRate;
      summary.payOT15 += ot15 * baseRate * award.weekdayOT1Multiplier;
      summary.payOT20 += ot20 * baseRate * award.weekdayOT2Multiplier;
    }

    summary.totalOrdinary = Math.round((summary.totalOrdinary + ord) * 100) / 100;
    summary.totalOT15 = Math.round((summary.totalOT15 + ot15) * 100) / 100;
    summary.totalOT20 = Math.round((summary.totalOT20 + ot20) * 100) / 100;
    summary.totalHoliday = Math.round((summary.totalHoliday + hol) * 100) / 100;

    dailyBreakdown.push({
      id: r.id,
      totalHours: Math.round(netHours * 10) / 10,
      ordHours: Math.round(ord * 10) / 10,
      otHours: Math.round((ot15 + ot20) * 10) / 10,
      holHours: Math.round(hol * 10) / 10,
    });
  });

  const grossPay = Math.round(
    (summary.payOrdinary + summary.payOT15 + summary.payOT20 + summary.payHoliday) * 100
  ) / 100;

  const superGuarantee = Math.round(summary.payOrdinary * award.superRate * 100) / 100;

  return {
    ...summary,
    grossPay,
    superGuarantee,
    baseRate: Math.round(baseRate * 100) / 100,
    dailyBreakdown,
  };
};
