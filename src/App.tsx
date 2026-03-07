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
      ord: 'Ordinary',
      ot: 'Overtime (1.5x)',
      hol: 'Holiday (2x)',
      gross: 'Gross Total',
      details: 'Daily Log',
      fairwork: 'Visit Fair Work Website',
      howItWorks: 'Calculation Rules',
      note1: 'Ordinary: Max 7.6h / day.',
      note2: 'Overtime: Applied after 7.6h.',
      note3: 'Unpaid Break: Fixed 0.5h meal break.'
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
      ord: '普通工時',
      ot: '加班 (1.5x)',
      hol: '假日 (2x)',
      gross: '稅前總額',
      details: '每日明細',
      fairwork: '造訪 Fair Work 官網',
      howItWorks: '計算規則',
      note1: '普通工時：每日最高 7.6 小時。',
      note2: '加班時數：每日超過 7.6 小時部分。',
      note3: '無薪休息：固定扣除 0.5 小時用餐時間。'
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
          <div className="config-card">
            <div className="input-group full-width">
              <label>{cur.rate}:</label>
              <div className="input-with-symbol">
                <span>$</span>
                <input 
                  type="number" 
                  value={hourlyRate} 
                  onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

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
          <div className="config-card sidebar-card">
            <div className="input-group full-width">
              <label>{cur.rate}:</label>
              <div className="input-with-symbol">
                <span>$</span>
                <input 
                  type="number" 
                  value={hourlyRate} 
                  onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="summary-card flat-block">
            <h3>{cur.summary}</h3>
            <div className="result-grid">
              <div className="res-item">
                <span>{cur.ord}:</span> 
                <strong className="res-val">{results.totalOrdinaryHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span>{cur.ot}:</span> 
                <strong className="res-val">{results.totalOT15xHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item">
                <span>{cur.hol}:</span> 
                <strong className="res-val">{results.totalHolidayHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item total">
                <span>{cur.gross}:</span>
                <strong className="res-val-uniform">${results.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
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
                  <span className="b-tag">Ord:{b.ord} | OT:{b.ot} | H:{b.hol}</span>
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
        <div className="footer-content">
          <div className="footer-left">
            <p className="footer-tag">Open Source Project | CC0 1.0 Universal</p>
            <p className="privacy-note">No data is collected. Everything stays in your browser.</p>
          </div>
          <div className="footer-right">
            <a href="https://github.com/crayon3shawn/payslip-checker" className="github-link" target="_blank" rel="noreferrer">GitHub Repo</a>
            <span className="v-tag">v1.3.9</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
