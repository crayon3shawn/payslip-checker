import { AU_REGS } from '../constants/regulations';

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

export const getResults = (records: DailyRecord[], hourlyRate: number, empType: EmploymentType, dailyLimit: number, minEngagement: number) => {
  const baseRate = empType === 'casual' 
    ? hourlyRate / (1 + AU_REGS.CASUAL_LOADING) 
    : hourlyRate;

  let summary = {
    totalOrdinary: 0,
    totalOT15: 0,
    totalOT20: 0,
    totalHoliday: 0,
    payOrdinary: 0,
    payOT15: 0,
    payOT20: 0,
    payHoliday: 0,
  };

  records.filter(r => r.enabled).forEach(r => {
    const dailyGross = calculateHours(r.startTime, r.endTime);
    let netHours = Math.max(0, dailyGross - (r.breakMinutes / 60));
    
    // Apply Minimum Engagement
    if (netHours > 0) {
      netHours = Math.max(netHours, minEngagement);
    }
    
    let ord = 0, ot15 = 0, ot20 = 0, hol = 0;
    const dayIndex = r.id; // 1=Mon, 6=Sat, 7=Sun

    if (r.isHoliday) {
      hol = netHours;
      summary.payHoliday += hol * baseRate * AU_REGS.PH_MULTIPLIER;
    } else if (dayIndex === 7) {
      hol = Math.max(netHours, AU_REGS.SUN_MIN_HOURS);
      summary.payHoliday += hol * baseRate * AU_REGS.SUN_MULTIPLIER;
    } else if (dayIndex === 6) {
      ot15 = Math.min(netHours, AU_REGS.SAT_OT_LEVEL_1_LIMIT);
      ot20 = Math.max(0, netHours - AU_REGS.SAT_OT_LEVEL_1_LIMIT);
      summary.payOT15 += ot15 * baseRate * AU_REGS.SAT_OT_LEVEL_1;
      summary.payOT20 += ot20 * baseRate * AU_REGS.SAT_OT_LEVEL_2;
    } else {
      ord = Math.min(netHours, dailyLimit);
      const remaining = Math.max(0, netHours - dailyLimit);
      
      ot15 = Math.min(remaining, AU_REGS.WEEKDAY_OT_LEVEL_1_LIMIT);
      ot20 = Math.max(0, remaining - AU_REGS.WEEKDAY_OT_LEVEL_1_LIMIT);
      
      const ordRate = empType === 'casual' ? hourlyRate : baseRate;
      summary.payOrdinary += ord * ordRate;
      summary.payOT15 += ot15 * baseRate * AU_REGS.OT_LEVEL_1;
      summary.payOT20 += ot20 * baseRate * AU_REGS.OT_LEVEL_2;
    }

    summary.totalOrdinary = Math.round((summary.totalOrdinary + ord) * 100) / 100;
    summary.totalOT15 = Math.round((summary.totalOT15 + ot15) * 100) / 100;
    summary.totalOT20 = Math.round((summary.totalOT20 + ot20) * 100) / 100;
    summary.totalHoliday = Math.round((summary.totalHoliday + hol) * 100) / 100;
  });

  // Rounding for precision
  const grossPay = Math.round((summary.payOrdinary + summary.payOT15 + summary.payOT20 + summary.payHoliday) * 100) / 100;
  
  // Super Guarantee (12%) is calculated based on Ordinary Time Earnings (OTE) only.
  const superGuarantee = Math.round(summary.payOrdinary * AU_REGS.SUPER_GUARANTEE_RATE * 100) / 100;

  return {
    ...summary,
    grossPay,
    superGuarantee,
    baseRate: Math.round(baseRate * 100) / 100
  };
};
