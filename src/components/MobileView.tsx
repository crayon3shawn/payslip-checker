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
  const smokoPresets = [30, 50, 65];

  return (
    <div className="mobile-only-view">
      <div className="mobile-cards">
        {records.map((r, i) => (
          <div 
            key={r.id} 
            className={`mobile-record-card spring-entry ${r.enabled ? '' : 'disabled-row'} ${r.isHoliday ? 'holiday-row' : ''}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
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
              <div className="mobile-smoko-input-area">
                <input 
                  type="number" 
                  className="time-input smoko-input" 
                  disabled={!r.enabled} 
                  value={r.breakMinutes || ''} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateRecord(r.id, 'breakMinutes', parseInt(e.target.value) || 0)} 
                />
                <div className="smoko-presets">
                  {smokoPresets.map(mins => (
                    <button 
                      key={mins} 
                      className={`preset-btn ${r.breakMinutes === mins ? 'active' : ''}`}
                      disabled={!r.enabled}
                      onClick={() => updateRecord(r.id, 'breakMinutes', mins)}
                    >
                      {mins}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mobile-sidebar-area spring-entry" style={{ animationDelay: '0.4s' }}>
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
