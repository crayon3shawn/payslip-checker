import { AU_REGS } from '../constants/regulations';

export interface DailyRecord {
  id: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  unpaidBreak: boolean;
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

export const getResults = (records: DailyRecord[], hourlyRate: number, empType: EmploymentType, dailyLimit: number) => {
  const baseRate = empType === 'casual' 
    ? hourlyRate / (1 + AU_REGS.CASUAL_LOADING) 
    : hourlyRate;

  let totalPay = 0;
  let summary = {
    totalOrdinary: 0,
    totalOT15: 0,
    totalOT20: 0,
    totalHoliday: 0,
  };

  const breakdown = records.filter(r => r.enabled).map(r => {
    const dailyGross = calculateHours(r.startTime, r.endTime);
    const netHours = Math.max(0, dailyGross - (r.unpaidBreak ? AU_REGS.UNPAID_BREAK_DURATION : 0));
    
    let ord = 0, ot15 = 0, ot20 = 0, hol = 0;
    const dayIndex = r.id; // 1=Mon, 6=Sat, 7=Sun

    if (r.isHoliday) {
      hol = netHours;
      totalPay += hol * baseRate * AU_REGS.PH_MULTIPLIER;
    } else if (dayIndex === 7) {
      hol = Math.max(netHours, AU_REGS.SUN_MIN_HOURS);
      totalPay += hol * baseRate * AU_REGS.SUN_MULTIPLIER;
    } else if (dayIndex === 6) {
      ot15 = Math.min(netHours, AU_REGS.SAT_OT_LEVEL_1_LIMIT);
      ot20 = Math.max(0, netHours - AU_REGS.SAT_OT_LEVEL_1_LIMIT);
      totalPay += (ot15 * baseRate * AU_REGS.SAT_OT_LEVEL_1) + (ot20 * baseRate * AU_REGS.SAT_OT_LEVEL_2);
    } else {
      // Use dynamic dailyLimit (e.g., 7.6 for 5 days, 9.5 for 4 days)
      ord = Math.min(netHours, dailyLimit);
      const remaining = Math.max(0, netHours - dailyLimit);
      
      // Weekday OT logic: first 3h @ 1.5x
      ot15 = Math.min(remaining, AU_REGS.WEEKDAY_OT_LEVEL_1_LIMIT);
      ot20 = Math.max(0, remaining - AU_REGS.WEEKDAY_OT_LEVEL_1_LIMIT);
      
      const ordRate = empType === 'casual' ? hourlyRate : baseRate;
      totalPay += (ord * ordRate) + (ot15 * baseRate * AU_REGS.OT_LEVEL_1) + (ot20 * baseRate * AU_REGS.OT_LEVEL_2);
    }

    summary.totalOrdinary = Math.round((summary.totalOrdinary + ord) * 100) / 100;
    summary.totalOT15 = Math.round((summary.totalOT15 + ot15) * 100) / 100;
    summary.totalOT20 = Math.round((summary.totalOT20 + ot20) * 100) / 100;
    summary.totalHoliday = Math.round((summary.totalHoliday + hol) * 100) / 100;

    return { 
      id: r.id, 
      net: netHours.toFixed(1),
      ord: ord.toFixed(1),
      ot15: ot15.toFixed(1),
      ot20: ot20.toFixed(1),
      hol: hol.toFixed(1)
    };
  });

  const grossPay = Math.round(totalPay * 100) / 100;
  const superGuarantee = Math.round(grossPay * AU_REGS.SUPER_GUARANTEE_RATE * 100) / 100;

  return {
    ...summary,
    grossPay,
    superGuarantee,
    breakdown,
    baseRate: Math.round(baseRate * 100) / 100
  };
};
