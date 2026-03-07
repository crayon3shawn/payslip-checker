import { useState, useEffect } from 'react';
import './App.css';
import { type DailyRecord, getResults } from './utils/calculator';

const DAYS = [
  { id: 1, en: 'Mon', cn: '週一' },
  { id: 2, en: 'Tue', cn: '週二' },
  { id: 3, en: 'Wed', cn: '週三' },
  { id: 4, en: 'Thu', cn: '週四' },
  { id: 5, en: 'Fri', cn: '週五' },
  { id: 6, en: 'Sat', cn: '週六' },
  { id: 7, en: 'Sun', cn: '週日' },
];

// Extend DailyRecord for UI
interface UIRecord extends DailyRecord {
  day: string;
  dayCn: string;
}

function App() {
  const [lang, setLang] = useState<'en' | 'tw'>('en');
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('hourlyRate');
    return saved ? parseFloat(saved) : 31.19;
  });
  const [records, setRecords] = useState<UIRecord[]>(() => {
    return DAYS.map((d) => ({
      id: d.id,
      day: d.en,
      dayCn: d.cn,
      enabled: d.id <= 5,
      startTime: '09:00',
      endTime: '17:00',
      unpaidBreak: true,
      isHoliday: false,
    }));
  });

  useEffect(() => {
    localStorage.setItem('hourlyRate', hourlyRate.toString());
  }, [hourlyRate]);

  const handleChange = (id: number, field: keyof UIRecord, value: any) => {
    setRecords(records.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const results = getResults(records, hourlyRate);

  const t = {
    en: {
      title: 'AU Payslip Checker',
      rate: 'Hourly Rate',
      on: 'ON',
      day: 'DAY',
      start: 'START',
      end: 'END',
      break: 'Unpaid Break',
      holiday: 'Holiday',
      summary: 'Pay Overview',
      ord: 'ORD',
      ot: 'OT (1.5x)',
      hol: 'Holiday (2x)',
      gross: 'Gross Total',
      super: 'Super (12%)',
      details: 'Daily Hours',
      fairwork: 'Visit Fair Work Website',
      howItWorks: 'Calculation Rules',
      note1: 'ORD: Max 7.6h / day.',
      note2: 'OT: Applied after 7.6h.',
      note3: 'Unpaid Break: Fixed 0.5h meal break.',
      privacy: 'No data leaves your device. Local only.'
    },
    tw: {
      title: 'AU Payslip Checker',
      rate: '基本時薪',
      on: 'ON',
      day: '星期',
      start: '上班打卡',
      end: '下班打卡',
      break: '無薪休息',
      holiday: '國定假日',
      summary: '薪資總覽',
      ord: '普通',
      ot: '加班 (1.5x)',
      hol: '假日 (2x)',
      gross: '稅前總額',
      super: '退休金 (12%)',
      details: '每日時數',
      fairwork: '造訪 Fair Work 官網',
      howItWorks: '計算規則',
      note1: '普通：每日最高 7.6 小時。',
      note2: '加班：每日超過 7.6 小時部分。',
      note3: '無薪休息：固定扣除 0.5 小時用餐時間。',
      privacy: '數據不離身。僅在本地瀏覽器計算。'
    }
  };

  const cur = t[lang];

  return (
    <div className="container">
      <header>
        <h1>{cur.title}</h1>
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
                  <th className="center" style={{ width: "50px" }}>{cur.on}</th>
                  <th className="center" style={{ width: "60px" }}>{cur.day}</th>
                  <th className="center">{cur.start}</th>
                  <th className="center">{cur.end}</th>
                  <th className="center" style={{ width: "80px" }}>{cur.break}</th>
                  <th className="center" style={{ width: "80px" }}>{cur.holiday}</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className={`${r.enabled ? '' : 'disabled-row'} ${r.isHoliday ? 'holiday-row' : ''}`}>
                    <td className="center cell-on">
                      <input type="checkbox" checked={r.enabled} onChange={() => handleChange(r.id, 'enabled', !r.enabled)} />
                    </td>
                    <td className="day-name center cell-day">{lang === 'en' ? r.day : r.dayCn}</td>
                    <td className="center cell-start">
                      <input 
                        type="text" 
                        value={r.startTime} 
                        className="time-input"
                        placeholder="00:00"
                        disabled={!r.enabled}
                        onChange={(e) => handleChange(r.id, 'startTime', e.target.value)} 
                      />
                    </td>
                    <td className="center cell-end">
                      <input 
                        type="text" 
                        value={r.endTime} 
                        className="time-input"
                        placeholder="00:00"
                        disabled={!r.enabled}
                        onChange={(e) => handleChange(r.id, 'endTime', e.target.value)} 
                      />
                    </td>
                    <td className="center cell-break">
                      <label className="checkbox-label">
                        <input type="checkbox" disabled={!r.enabled} checked={r.unpaidBreak} onChange={() => handleChange(r.id, 'unpaidBreak', !r.unpaidBreak)} />
                        <span className="mobile-only-text">{cur.break}</span>
                      </label>
                    </td>
                    <td className="center cell-holiday">
                      <label className="checkbox-label">
                        <input type="checkbox" disabled={!r.enabled} checked={r.isHoliday} onChange={() => handleChange(r.id, 'isHoliday', !r.isHoliday)} />
                        <span className="mobile-only-text">{cur.holiday}</span>
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
            <h3>{cur.rate}</h3>
            <div className="input-group full-width no-label">
              <div className="input-with-symbol">
                <span>$</span>
                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <div className="summary-card flat-block">
            <h3>{cur.summary}</h3>
            <div className="result-grid">
              <div className="res-item">
                <span className="res-label">{cur.ord}</span>
                <strong className="res-val">{results.totalOrdinaryHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span className="res-label">{cur.ot}</span>
                <strong className="res-val">{results.totalOT15xHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span className="res-label">{cur.hol}</span>
                <strong className="res-val">{results.totalHolidayHours.toFixed(1)}h</strong>
              </div>
              
              <div className="separator-line"></div>
              
              <div className="res-item accent-row">
                <span className="res-label">{cur.gross}</span>
                <strong className="res-val-uniform">${results.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
              </div>
              
              <div className="res-item">
                <span className="res-label">{cur.super}</span>
                <strong className="res-val-uniform">${results.superGuarantee.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
              </div>
            </div>
          </div>

          <div className="details-card flat-block">
            <h3>{cur.details}</h3>
            <div className="breakdown-list">
              {results.breakdown.length === 0 && <p className="empty-msg">No entries</p>}
              {results.breakdown.map((b, i) => (
                <div key={i} className="b-item">
                  <span className="b-day">{(records[i] as any).day || 'Day'}</span>
                  <span className="b-val">{b.net}h</span>
                  <span className="b-tag">{cur.ord}:{b.ord} | {lang === 'en' ? 'OT' : '加班'}:{b.ot} | {lang === 'en' ? 'H' : '假'}:{b.hol}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="logic-card flat-block">
            <h3>{cur.howItWorks}</h3>
            <div className="note-group">
              <p className="note highlight">• {cur.note1}</p>
              <p className="note highlight">• {cur.note2}</p>
              <p className="note highlight">• {cur.note3}</p>
            </div>
          </div>
          
          <a href="https://www.fairwork.gov.au/" target="_blank" rel="noreferrer" className="fw-minimal-link">
             {cur.fairwork} →
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
            <span className="v-tag-small">v1.4.6</span>
          </div>
          <p className="privacy-msg-en">{cur.privacy}</p>
          <div className="footer-row license-line">
            <span>Licensed under CC BY 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
