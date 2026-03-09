import React from 'react';
import { type UIRecord } from '../hooks/usePayslip';
import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  lang: 'en' | 'tw';
  records: UIRecord[];
  updateRecord: <K extends keyof UIRecord>(id: number, field: K, value: UIRecord[K]) => void;
  showRules: boolean;
  setShowRules: (v: boolean) => void;
  renderRuleContent: () => React.ReactNode;
  Sidebar: React.ReactNode;
}

export function DesktopView({ t, lang, records, updateRecord, showRules, setShowRules, renderRuleContent, Sidebar }: Props) {
  
  // Smart time formatter: 0630 -> 06:30
  const formatTimeInput = (val: string): string => {
    // Remove all non-digits
    const digits = val.replace(/\D/g, '').slice(0, 4);
    
    if (digits.length <= 2) {
      return digits;
    } else {
      return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
  };

  const onTimeChange = (id: number, field: 'startTime' | 'endTime', rawVal: string) => {
    const formatted = formatTimeInput(rawVal);
    updateRecord(id, field, formatted);
  };

  return (
    <div className="main-layout desktop-only-view">
      <section className="input-section">
        <div className="table-wrapper">
          <table className="record-table">
            <thead>
              <tr>
                <th className="center" style={{ width: "50px" }}>{t.on}</th>
                <th className="center" style={{ width: "60px" }}>{t.day}</th>
                <th className="center">{t.start}</th>
                <th className="center">{t.end}</th>
                <th className="center" style={{ width: "120px" }}>{t.break}</th>
                <th className="center" style={{ width: "80px" }}>{t.holiday}</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className={`${r.enabled ? '' : 'disabled-row'} ${r.isHoliday ? 'holiday-row' : ''}`}>
                  <td className="center cell-on">
                    <input type="checkbox" checked={r.enabled} onChange={() => updateRecord(r.id, 'enabled', !r.enabled)} />
                  </td>
                  <td className="day-name center cell-day">{lang === 'en' ? r.day : r.dayCn}</td>
                  <td className="center">
                    <input 
                      type="text" 
                      placeholder="00:00"
                      value={r.startTime} 
                      className="time-input" 
                      disabled={!r.enabled} 
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onTimeChange(r.id, 'startTime', e.target.value)} 
                    />
                  </td>
                  <td className="center">
                    <input 
                      type="text" 
                      placeholder="00:00"
                      value={r.endTime} 
                      className="time-input" 
                      disabled={!r.enabled} 
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onTimeChange(r.id, 'endTime', e.target.value)} 
                    />
                  </td>
                  <td className="center">
                    <div className="break-input-wrapper">
                      <input 
                        type="number" 
                        className="time-input mini-input" 
                        disabled={!r.enabled} 
                        value={r.breakMinutes || ''} 
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateRecord(r.id, 'breakMinutes', parseInt(e.target.value) || 0)} 
                      />
                    </div>
                  </td>
                  <td className="center">
                    <input type="checkbox" disabled={!r.enabled} checked={r.isHoliday} onChange={() => updateRecord(r.id, 'isHoliday', !r.isHoliday)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="logic-card flat-block">
          <div className="logic-header" onClick={() => setShowRules(!showRules)}>
            <h3 className="section-title">{t.howItWorks}</h3>
            <span className={`arrow ${showRules ? 'up' : ''}`}>▼</span>
          </div>
          {showRules && renderRuleContent()}
        </div>
      </section>
      <aside className="sidebar">
        {Sidebar}
      </aside>
    </div>
  );
}
