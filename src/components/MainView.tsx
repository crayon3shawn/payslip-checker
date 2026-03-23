import { type ReactNode } from 'react';
import { type UIRecord } from '../hooks/usePayslip';
import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  lang: 'en' | 'tw';
  records: UIRecord[];
  updateRecord: <K extends keyof UIRecord>(id: number, field: K, value: UIRecord[K]) => void;
  showRules: boolean;
  setShowRules: (v: boolean) => void;
  renderRuleContent: () => ReactNode;
  awardShortName: string;
  Sidebar: ReactNode;
  ResourceLinks: ReactNode;
}

export function MainView({
  t, lang, records, updateRecord,
  showRules, setShowRules, renderRuleContent,
  awardShortName, Sidebar, ResourceLinks,
}: Props) {
  return (
    <div className="main-layout">
      <section className="input-section spring-entry">
        <div className="records-wrapper">
          <div className="records-header">
            <span>{t.on}</span>
            <span>{t.day}</span>
            <span>{t.start}</span>
            <span>{t.end}</span>
            <span className="col-center">Unpaid<br />Break</span>
            <span className="col-center">{t.holiday}</span>
          </div>
          {records.map((r, i) => (
            <div
              key={r.id}
              className={`day-record spring-entry${r.enabled ? '' : ' disabled-row'}${r.isHoliday ? ' holiday-row' : ''}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="day-checkbox">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => updateRecord(r.id, 'enabled', !r.enabled)}
                />
              </div>
              <div className="day-name">
                {lang === 'en' ? r.day : r.dayCn}
              </div>
              <div className="day-start">
                <span className="field-label">{t.start}</span>
                <input
                  type="time"
                  step="60"
                  value={r.startTime}
                  className="time-input"
                  disabled={!r.enabled}
                  onChange={(e) => updateRecord(r.id, 'startTime', e.target.value)}
                />
              </div>
              <div className="day-end">
                <span className="field-label">{t.end}</span>
                <input
                  type="time"
                  step="60"
                  value={r.endTime}
                  className="time-input"
                  disabled={!r.enabled}
                  onChange={(e) => updateRecord(r.id, 'endTime', e.target.value)}
                />
              </div>
              <div className="day-break col-center">
                <span className="field-label">{t.break}</span>
                <input
                  type="number"
                  className="time-input break-input"
                  disabled={!r.enabled}
                  value={r.breakMinutes || ''}
                  min={0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateRecord(r.id, 'breakMinutes', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="day-holiday col-center">
                <span className="field-label">{t.holiday}</span>
                <input
                  type="checkbox"
                  disabled={!r.enabled}
                  checked={r.isHoliday}
                  onChange={() => updateRecord(r.id, 'isHoliday', !r.isHoliday)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="logic-card flat-block">
          <div className="logic-header" onClick={() => setShowRules(!showRules)}>
            <h3 className="section-title">
              {t.howItWorks}
              <span className="award-rules-badge">{awardShortName}</span>
            </h3>
            <span className={`arrow ${showRules ? 'up' : ''}`}>▼</span>
          </div>
          {showRules && renderRuleContent()}
        </div>
      </section>

      <aside className="sidebar spring-entry" style={{ animationDelay: '0.15s' }}>
        {Sidebar}
        {ResourceLinks}
      </aside>
    </div>
  );
}
