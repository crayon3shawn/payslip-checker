import { useState, useEffect } from 'react';
import './App.css';

interface DailyRecord {
  id: number;
  day: string;
  dayCn: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  unpaidBreak: boolean;
  isHoliday: boolean;
}

const DAYS = [
  { id: 1, en: 'Mon', cn: '週一' },
  { id: 2, en: 'Tue', cn: '週二' },
  { id: 3, en: 'Wed', cn: '週三' },
  { id: 4, en: 'Thu', cn: '週四' },
  { id: 5, en: 'Fri', cn: '週五' },
  { id: 6, en: 'Sat', cn: '週六' },
  { id: 7, en: 'Sun', cn: '週日' },
];

function App() {
  const [lang, setLang] = useState<'en' | 'cn'>('en');
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('hourlyRate');
    return saved ? parseFloat(saved) : 30;
  });
  const [records, setRecords] = useState<DailyRecord[]>(() => {
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

  const handleChange = (id: number, field: keyof DailyRecord, value: any) => {
    setRecords(records.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const calculateHours = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diff = (eH + eM / 60) - (sH + sM / 60);
    if (diff < 0) diff += 24; 
    return diff;
  };

  const getResults = () => {
    let totalOrdinaryHours = 0;
    let totalOT15xHours = 0;
    let totalHolidayHours = 0;
    let breakdown: any[] = [];

    records.filter(r => r.enabled).forEach(r => {
      let dailyGross = calculateHours(r.startTime, r.endTime);
      let netHours = dailyGross - (r.unpaidBreak ? 0.5 : 0);
      if (netHours < 0) netHours = 0;

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
        day: lang === 'en' ? r.day : r.dayCn,
        net: netHours.toFixed(1),
        ord: ordinary.toFixed(1),
        ot: ot.toFixed(1),
        hol: holiday.toFixed(1)
      });
    });

    const grossPay = (totalOrdinaryHours * hourlyRate) + 
                     (totalOT15xHours * hourlyRate * 1.5) + 
                     (totalHolidayHours * hourlyRate * 2.0);

    return { totalOrdinaryHours, totalOT15xHours, totalHolidayHours, grossPay, breakdown };
  };

  const results = getResults();

  const t = {
    en: {
      title: 'AU Payslip Check',
      rate: 'Hourly Rate',
      day: 'DAY',
      on: 'ON',
      start: 'START',
      end: 'END',
      break: 'UNPAID BREAK',
      holiday: 'PUBLIC HOLIDAY',
      summary: 'Pay Summary',
      ord: 'Ordinary',
      ot: 'Overtime',
      hol: 'Holiday',
      gross: 'Gross Total',
      details: 'Daily Log',
      link: 'Fair Work Official Site',
      note1: 'OT starts after 7.6h daily.',
      note2: 'Break: 0.5h unpaid meal break.'
    },
    cn: {
      title: 'AU Payslip Check',
      rate: '基本時薪',
      day: '日期',
      on: '上班',
      start: '上班時間',
      end: '下班時間',
      break: '扣除用餐',
      holiday: '國定假日',
      summary: '薪資總結',
      ord: '普通工時',
      ot: '加班時數',
      hol: '假日工時',
      gross: '稅前總額',
      details: '每日明細',
      link: 'Fair Work 官方網站',
      note1: '加班：每日超過 7.6h。',
      note2: '用餐：扣除 0.5h 不計薪休息。'
    }
  };

  const cur = t[lang];

  return (
    <div className="container">
      <header>
        <div className="brand">
          <h1>{cur.title}</h1>
          <span className="badge">v1.3 AU AWARD</span>
        </div>
        <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'cn' : 'en')}>
          {lang === 'en' ? '繁體中文' : 'English'}
        </button>
      </header>

      <div className="main-layout">
        <section className="input-section">
          <div className="config-card">
            <div className="input-group">
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
                  <th className="center" width="50">{cur.on}</th>
                  <th className="center" width="60">{cur.day}</th>
                  <th className="center">{cur.start}</th>
                  <th className="center">{cur.end}</th>
                  <th className="center" width="80">{cur.break}</th>
                  <th className="center" width="80">{cur.holiday}</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className={`${r.enabled ? '' : 'disabled-row'} ${r.isHoliday ? 'holiday-row' : ''}`}>
                    <td className="center">
                      <input type="checkbox" checked={r.enabled} onChange={() => handleChange(r.id, 'enabled', !r.enabled)} />
                    </td>
                    <td className="day-name center">{lang === 'en' ? r.day : r.dayCn}</td>
                    <td className="center">
                      <input 
                        type="text" 
                        value={r.startTime} 
                        className="time-input"
                        placeholder="00:00"
                        disabled={!r.enabled}
                        onChange={(e) => handleChange(r.id, 'startTime', e.target.value)} 
                      />
                    </td>
                    <td className="center">
                      <input 
                        type="text" 
                        value={r.endTime} 
                        className="time-input"
                        placeholder="00:00"
                        disabled={!r.enabled}
                        onChange={(e) => handleChange(r.id, 'endTime', e.target.value)} 
                      />
                    </td>
                    <td className="center">
                      <input type="checkbox" disabled={!r.enabled} checked={r.unpaidBreak} onChange={() => handleChange(r.id, 'unpaidBreak', !r.unpaidBreak)} />
                    </td>
                    <td className="center">
                      <input type="checkbox" disabled={!r.enabled} checked={r.isHoliday} onChange={() => handleChange(r.id, 'isHoliday', !r.isHoliday)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="sidebar">
          <div className="summary-card shadow-block">
            <h2>{cur.summary}</h2>
            <div className="result-grid">
              <div className="res-item align-between">
                <span>{cur.ord}:</span> 
                <strong className="res-val">{results.totalOrdinaryHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item align-between">
                <span>{cur.ot}:</span> 
                <strong className="res-val">{results.totalOT15xHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item align-between">
                <span>{cur.hol}:</span> 
                <strong className="res-val">{results.totalHolidayHours.toFixed(1)}h</strong>
              </div>
              <div className="res-item total">
                <span>{cur.gross}</span>
                <strong className="res-val">${results.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
              </div>
            </div>
          </div>

          <div className="details-card shadow-block">
            <h3>{cur.details}</h3>
            <div className="breakdown-list">
              {results.breakdown.length === 0 && <p className="empty-msg">No entries</p>}
              {results.breakdown.map((b, i) => (
                <div key={i} className="b-item align-left">
                  <span className="b-day">{b.day}</span>
                  <span className="b-val">{b.net}h</span>
                  <span className="b-tag">Ord:{b.ord} | OT:{b.ot} | H:{b.hol}</span>
                </div>
              ))}
            </div>
            <div className="note-group">
              <p className="note">• {cur.note1}</p>
              <p className="note">• {cur.note2}</p>
            </div>
          </div>

          <a href="https://www.fairwork.gov.au/" target="_blank" rel="noreferrer" className="fw-card">
             <div className="fw-logo">FW</div>
             <div className="fw-text">
               <strong>Fair Work Ombudsman</strong>
               <span>{cur.link}</span>
             </div>
          </a>
        </aside>
      </div>
    </div>
  );
}

export default App;
