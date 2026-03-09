import React from 'react';
import { type UIRecord } from '../hooks/usePayslip';
import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  lang: 'en' | 'tw';
  records: UIRecord[];
  updateRecord: any;
  showRules: boolean;
  setShowRules: (v: boolean) => void;
  renderRuleContent: () => React.ReactNode;
  Sidebar: React.ReactNode;
  ResourceLinks: React.ReactNode;
}

export function MobileView({ t, lang, records, updateRecord, showRules, setShowRules, renderRuleContent, Sidebar, ResourceLinks }: Props) {
  return (
    <div className="mobile-only-view">
      <div className="mobile-cards">
        {records.map(r => (
          <div key={r.id} className={`mobile-record-card ${r.enabled ? '' : 'disabled-row'} ${r.isHoliday ? 'holiday-row' : ''}`}>
            <div className="mobile-row-1">
              <label className="mobile-day-label">
                <input 
                  type="checkbox" 
                  checked={r.enabled} 
                  onChange={() => updateRecord(r.id, 'enabled', !r.enabled)} 
                />
                <span className="mobile-day-name">{lang === 'en' ? r.day : r.dayCn}</span>
              </label>
              <label className="mobile-holiday-label">
                <span className="mobile-label-text">{t.holiday}</span>
                <input 
                  type="checkbox" 
                  disabled={!r.enabled} 
                  checked={r.isHoliday} 
                  onChange={() => updateRecord(r.id, 'isHoliday', !r.isHoliday)} 
                />
              </label>
            </div>

            <div className="mobile-row-stacked">
              <span className="mobile-label-text">{t.start}</span>
              <input type="time" step="60" value={r.startTime} className="time-input" disabled={!r.enabled} onChange={(e) => updateRecord(r.id, 'startTime', e.target.value)} />
            </div>

            <div className="mobile-row-stacked">
              <span className="mobile-label-text">{t.end}</span>
              <input type="time" step="60" value={r.endTime} className="time-input" disabled={!r.enabled} onChange={(e) => updateRecord(r.id, 'endTime', e.target.value)} />
            </div>

            <div className="mobile-row-stacked">
              <span className="mobile-label-text">{t.break}</span>
              <input 
                type="number" 
                className="time-input" 
                disabled={!r.enabled} 
                value={r.breakMinutes || ''} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateRecord(r.id, 'breakMinutes', parseInt(e.target.value) || 0)} 
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mobile-sidebar-area">
        {Sidebar}
        <div className="logic-card flat-block">
          <div className="logic-header" onClick={() => setShowRules(!showRules)}>
            <h3 className="section-title">{t.howItWorks}</h3>
            <span className={`arrow ${showRules ? 'up' : ''}`}>▼</span>
          </div>
          {showRules && renderRuleContent()}
        </div>
        {ResourceLinks}
      </div>
    </div>
  );
}
