import { useState } from 'react';
import './App.css';
import { usePayslip } from './hooks/usePayslip';
import { tw } from './locales/tw';
import { en } from './locales/en';

function App() {
  const [lang, setLang] = useState<'en' | 'tw'>('en');
  const { hourlyRate, setHourlyRate, records, updateRecord, results } = usePayslip();

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
                      <input 
                        type="text" 
                        value={r.startTime} 
                        className="time-input"
                        placeholder="00:00"
                        disabled={!r.enabled}
                        onChange={(e) => updateRecord(r.id, 'startTime', e.target.value)} 
                      />
                    </td>
                    <td className="center cell-end">
                      <input 
                        type="text" 
                        value={r.endTime} 
                        className="time-input"
                        placeholder="00:00"
                        disabled={!r.enabled}
                        onChange={(e) => updateRecord(r.id, 'endTime', e.target.value)} 
                      />
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
        </section>

        <aside className="sidebar">
          <div className="sidebar-card">
            <h3>{t.rate}</h3>
            <div className="input-group full-width no-label">
              <div className="input-with-symbol">
                <span>$</span>
                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <div className="summary-card flat-block">
            <h3>{t.summary}</h3>
            <div className="result-grid">
              <div className="res-item">
                <span className="res-label">{t.ord}</span>
                <strong className="res-val">{results.totalOrdinaryHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span className="res-label">{t.ot}</span>
                <strong className="res-val">{results.totalOT15xHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span className="res-label">{t.hol}</span>
                <strong className="res-val">{results.totalHolidayHours.toFixed(1)}h</strong>
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

          <div className="details-card flat-block">
            <h3>{t.details}</h3>
            <div className="breakdown-list">
              {results.breakdown.length === 0 && <p className="empty-msg">No entries</p>}
              {results.breakdown.map((b, i) => (
                <div key={i} className="b-item">
                  <span className="b-day">{(records[i] as any).day || 'Day'}</span>
                  <span className="b-val">{b.net}h</span>
                  <span className="b-tag">{lang === 'en' ? 'ORD' : t.ord}:{b.ord} | {lang === 'en' ? 'OT' : t.ot}:{b.ot} | {lang === 'en' ? 'H' : '假'}:{b.hol}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="logic-card flat-block">
            <h3>{t.howItWorks}</h3>
            <div className="note-group">
              <p className="note highlight">• {t.note1}</p>
              <p className="note highlight">• {t.note2}</p>
              <p className="note highlight">• {t.note3}</p>
            </div>
          </div>
          
          <a href="https://www.fairwork.gov.au/" target="_blank" rel="noreferrer" className="fw-minimal-link">
             {t.fairwork} →
          </a>
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
            <span className="v-tag-small">v1.5.4</span>
          </div>
          <p className="privacy-msg-en">No data leaves your device. All calculations are performed locally.</p>
          <div className="footer-row license-line">
            <span>Licensed under CC BY 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
