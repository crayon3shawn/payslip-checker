import { useState } from 'react';
import './App.css';
import { usePayslip } from './hooks/usePayslip';
import { tw } from './locales/tw';
import { en } from './locales/en';

function App() {
  const [lang, setLang] = useState<'en' | 'tw'>('en');
  const [showRules, setShowRules] = useState(true); // Default show rules on desktop
  const { hourlyRate, setHourlyRate, empType, setEmpType, records, updateRecord, results, dailyLimit } = usePayslip();

  const t = lang === 'en' ? en : tw;

  return (
    <div className="container">
      <header>
        <h1>{t.title}</h1>
        <div className="header-right">
          <button className="lang-toggle-circle" onClick={() => setLang(lang === 'en' ? 'tw' : 'en')}>
            {lang === 'en' ? '中' : 'EN'}
          </button>
        </div>
      </header>

      <div className="main-layout">
        <section className="input-section">
          <div className="table-wrapper">
            <table className="record-table">
              <thead>
                <tr>
                  <th className="center" style={{ width: "50px" }}>{t.on}</th>
                  <th className="center" style={{ width: "60px" }}>{t.day}</th>
                  <th className="center">{t.start}</th>
                  <th className="center">{t.end}</th>
                  <th className="center" style={{ width: "80px" }}>{t.break}</th>
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
                    <td className="center cell-start">
                      <input type="time" value={r.startTime} className="time-input" disabled={!r.enabled} onChange={(e) => updateRecord(r.id, 'startTime', e.target.value)} />
                    </td>
                    <td className="center cell-end">
                      <input type="time" value={r.endTime} className="time-input" disabled={!r.enabled} onChange={(e) => updateRecord(r.id, 'endTime', e.target.value)} />
                    </td>
                    <td className="center cell-break">
                      <label className="checkbox-label">
                        <input type="checkbox" disabled={!r.enabled} checked={r.unpaidBreak} onChange={() => updateRecord(r.id, 'unpaidBreak', !r.unpaidBreak)} />
                        <span className="mobile-only-text">{t.break}</span>
                      </label>
                    </td>
                    <td className="center cell-holiday">
                      <label className="checkbox-label">
                        <input type="checkbox" disabled={!r.enabled} checked={r.isHoliday} onChange={() => updateRecord(r.id, 'isHoliday', !r.isHoliday)} />
                        <span className="mobile-only-text">{t.holiday}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="logic-card flat-block">
            <div className="logic-header" onClick={() => setShowRules(!showRules)}>
              <h3>{t.howItWorks}</h3>
              <span className={`arrow ${showRules ? 'up' : ''}`}>▼</span>
            </div>
            {showRules && (
              <div className="note-group">
                <p className="note highlight">• <strong>{dailyLimit}h</strong> {t.rule_limit}</p>
                <p className="note highlight">• {t.rule_weekday}</p>
                <p className="note highlight">• {t.rule_sat}</p>
                <p className="note highlight">• {t.rule_sun}</p>
                {empType === 'casual' && <p className="note highlight">• {t.rule_casual}</p>}
                <div className="disclaimer-mini">{t.disclaimer}</div>
              </div>
            )}
          </div>
        </section>

        <aside className="sidebar">
          <div className="sidebar-card">
            <h3>{t.rate}</h3>
            <div className="rate-setting-group">
              <div className="input-with-symbol">
                <span>$</span>
                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="emp-toggle">
                <button className={empType === 'permanent' ? 'active' : ''} onClick={() => setEmpType('permanent')}>{t.permanent}</button>
                <button className={empType === 'casual' ? 'active' : ''} onClick={() => setEmpType('casual')}>{t.casual}</button>
              </div>
              {empType === 'casual' && (
                <div className="base-rate-hint">
                  {t.baseRateHint}: <strong>${results.baseRate}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="summary-card flat-block">
            <h3>{t.summary}</h3>
            <div className="result-grid">
              <div className="res-item">
                <span className="res-label">{t.ord}</span>
                <strong className="res-val">{results.totalOrdinary.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span className="res-label">{t.ot15}</span>
                <strong className="res-val">{results.totalOT15.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span className="res-label">{t.ot20}</span>
                <strong className="res-val">{results.totalOT20.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span className="res-label">{t.hol}</span>
                <strong className="res-val">{results.totalHoliday.toFixed(1)}h</strong>
              </div>
              
              <div className="separator-line"></div>
              
              <div className="res-item accent-row">
                <span className="res-label">{t.gross}</span>
                <strong className="res-val-uniform">${results.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
              </div>
              
              <div className="res-item">
                <span className="res-label">{t.super}</span>
                <strong className="res-val-uniform">${results.superGuarantee.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
              </div>
            </div>
          </div>

          <div className="resource-links">
            <a href="https://www.fairwork.gov.au/" target="_blank" rel="noreferrer" className="fw-link-card">
               <span className="link-title">{t.fwo_site}</span>
               <span className="link-arrow">→</span>
            </a>
            <a href="https://calculate.fairwork.gov.au/FindYourAward" target="_blank" rel="noreferrer" className="fw-link-card highlight-link">
               <span className="link-title">{t.fwo_calc}</span>
               <span className="link-arrow">→</span>
            </a>
          </div>
        </aside>
      </div>
      
      <footer className="version-footer">
        <div className="footer-centered-content">
          <div className="footer-row main-line">
            <span>© 2026 chengche</span>
            <span className="dot">·</span>
            <a href="https://github.com/crayon3shawn/payslip-checker" className="github-link-with-icon" target="_blank" rel="noreferrer">
              <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
              GitHub
            </a>
            <span className="dot">·</span>
            <span className="v-tag-small">v1.6.0</span>
          </div>
          <p className="privacy-msg-en">{t.privacy}</p>
          <div className="footer-row license-line">
            <span>Licensed under CC BY 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
