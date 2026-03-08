import { type UIRecord } from '../hooks/usePayslip';
import { type Translation } from '../locales/tw';

export const formatPaySummary = (
  t: Translation,
  lang: 'en' | 'tw',
  records: UIRecord[],
  results: any
): string => {
  let text = `${t.title} Summary\n--------------------------\n`;
  
  records.filter(r => r.enabled).forEach(r => {
    const day = lang === 'en' ? r.day : r.dayCn;
    text += `${day}: ${r.startTime}-${r.endTime} (${r.breakMinutes}m smoko)${r.isHoliday ? ' [PH]' : ''}\n`;
  });
  
  text += `--------------------------\n`;
  text += `${t.ord}: ${results.totalOrdinary.toFixed(2)}h ($${results.payOrdinary.toFixed(2)})\n`;
  
  if (results.totalOT15 > 0) {
    text += `${t.ot15}: ${results.totalOT15.toFixed(2)}h ($${results.payOT15.toFixed(2)})\n`;
  }
  
  if (results.totalOT20 > 0) {
    text += `${t.ot20}: ${results.totalOT20.toFixed(2)}h ($${results.payOT20.toFixed(2)})\n`;
  }
  
  if (results.totalHoliday > 0) {
    text += `${t.hol}: ${results.totalHoliday.toFixed(2)}h ($${results.payHoliday.toFixed(2)})\n`;
  }
  
  text += `--------------------------\n`;
  text += `${t.gross}: $${results.grossPay.toFixed(2)}\n`;
  text += `${t.super} (OTE): $${results.superGuarantee.toFixed(2)}\n`;
  
  return text;
};
