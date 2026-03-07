export interface DailyRecord {
  id: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  unpaidBreak: boolean;
  isHoliday: boolean;
}

export const calculateHours = (start: string, end: string) => {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH + eM / 60) - (sH + sM / 60);
  if (diff < 0) diff += 24; 
  return diff;
};

export const getResults = (records: DailyRecord[], hourlyRate: number) => {
  let totalOrdinaryHours = 0;
  let totalOT15xHours = 0;
  let totalHolidayHours = 0;
  let breakdown: any[] = [];

  records.filter(r => r.enabled).forEach(r => {
    let dailyGross = calculateHours(r.startTime, r.endTime);
    let netHours = Math.max(0, dailyGross - (r.unpaidBreak ? 0.5 : 0));

    let ordinary = 0;
    let ot = 0;
    let holiday = 0;

    if (r.isHoliday) {
      holiday = netHours;
    } else {
      if (netHours > 7.6) {
        ordinary = 7.6;
        ot = netHours - 7.6;
      } else {
        ordinary = netHours;
      }
    }

    totalOrdinaryHours += ordinary;
    totalOT15xHours += ot;
    totalHolidayHours += holiday;

    breakdown.push({
      net: netHours.toFixed(1),
      ord: ordinary.toFixed(1),
      ot: ot.toFixed(1),
      hol: holiday.toFixed(1)
    });
  });

  // Use Math.round to handle floating point issues for total hours
  totalOrdinaryHours = Math.round(totalOrdinaryHours * 100) / 100;
  totalOT15xHours = Math.round(totalOT15xHours * 100) / 100;
  totalHolidayHours = Math.round(totalHolidayHours * 100) / 100;

  const grossPay = (totalOrdinaryHours * hourlyRate) + 
                   (totalOT15xHours * hourlyRate * 1.5) + 
                   (totalHolidayHours * hourlyRate * 2.0);

  return { totalOrdinaryHours, totalOT15xHours, totalHolidayHours, grossPay, breakdown };
};
