import { useState, useEffect } from 'react';
import './App.css';
import { usePayslip } from './hooks/usePayslip';
import { tw } from './locales/tw';
import { en } from './locales/en';
import { formatPaySummary } from './utils/formatters';
import { ResetModal } from './components/ResetModal';
import { MainView } from './components/MainView';

function App() {
  const [lang, setLang] = useState<'en' | 'tw'>('en');
  const [showRules, setShowRules] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const {
    hourlyRate, setHourlyRate,
    minEngagement, setMinEngagement,
    empType, setEmpType,
    records, updateRecord,
    results, resetAllData
  } = usePayslip();

  const t = lang === 'en' ? en : tw;

  useEffect(() => {
    if (results.grossPay > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 500);
      return () => clearTimeout(timer);
    }
  }, [results.grossPay]);

  const handleCopy = () => {
    const text = formatPaySummary(t, lang, records, results);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderRule = (text: string) => {
    const parts = text.split(/[:：]/);
    if (parts.length > 1) {
      return (
        <p className="note highlight">
          • <strong>{parts[0]}</strong>: {parts.slice(1).join(':')}
        </p>
      );
    }
    return <p className="note highlight">• {text}</p>;
  };

  const renderRuleContent = () => (
    <div className="note-group">
      {renderRule(t.rule_limit)}
      {renderRule(t.rule_minimum)}
      {renderRule(t.rule_break)}
      {renderRule(t.rule_weekday)}
      {renderRule(t.rule_sat)}
      {renderRule(t.rule_sun)}
      {renderRule(t.rule_super)}
      {empType === 'casual' && <p className="note highlight">• {t.rule_casual}</p>}
      <div className="separator-mini"></div>
      {renderRule(t.rule_fwo)}
      <div className="disclaimer-mini">{t.disclaimer}</div>
    </div>
  );

  // Day names for daily hours section
  const DAY_NAMES: Record<number, { en: string; tw: string }> = {
    1: { en: 'Mon', tw: '週一' },
    2: { en: 'Tue', tw: '週二' },
    3: { en: 'Wed', tw: '週三' },
    4: { en: 'Thu', tw: '週四' },
    5: { en: 'Fri', tw: '週五' },
    6: { en: 'Sat', tw: '週六' },
    7: { en: 'Sun', tw: '週日' },
  };

  const SidebarContent = (
    <>
      {/* HOURLY RATE */}
      <div className="sidebar-card">
        <h3 className="section-title">{t.hourlyRateLabel}</h3>
        <div className="rate-input-row">
          <div className="input-with-symbol rate-big">
            <span>$</span>
            <input
              type="number"
              step="0.01"
              value={hourlyRate || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="emp-settings-compact">
          <div className="setting-row-mini">
            <span className="setting-label">{t.minEngLabel}</span>
            <div className="input-with-symbol mini">
              <input
                type="number"
                step="0.5"
                value={minEngagement || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMinEngagement(parseFloat(e.target.value) || 0)}
              />
            </div>
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

      {/* PAY OVERVIEW */}
      <div className="summary-card flat-block">
        <h3 className="section-title">{t.summary}</h3>
        <div className="pay-overview-grid">
          <div className="po-row">
            <span className="po-label">{t.ord}</span>
            <span className="po-hours">{results.totalOrdinary.toFixed(1)}h</span>
          </div>
          <div className="po-row">
            <span className="po-label">{t.ot15}</span>
            <span className="po-hours">{results.totalOT15.toFixed(1)}h</span>
          </div>
          <div className="po-row">
            <span className="po-label">{t.hol}</span>
            <span className="po-hours">{(results.totalOT20 + results.totalHoliday).toFixed(1)}h</span>
          </div>
          <div className="po-separator"></div>
          <div className="po-row po-accent">
            <span className="po-label">{t.gross}</span>
            <strong className={`po-amount ${isPulsing ? 'gross-pulse' : ''}`}>
              ${results.grossPay.toLocaleString(undefined, { minimumFractionDigits: 3 })}
            </strong>
          </div>
          <div className="po-row po-super">
            <span className="po-label">{t.super} (12%)</span>
            <strong className="po-amount po-super-amount">
              ${results.superGuarantee.toLocaleString(undefined, { minimumFractionDigits: 3 })}
            </strong>
          </div>
        </div>
        <button className={`copy-summary-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? t.copyDone : t.copyBtn}
        </button>
      </div>

      {/* DAILY HOURS */}
      {results.dailyBreakdown.length > 0 && (
        <div className="sidebar-card">
          <h3 className="section-title">{t.details}</h3>
          <div className="daily-hours-list">
            {results.dailyBreakdown.map((d) => {
              const names = DAY_NAMES[d.id];
              const dayName = lang === 'en' ? names?.en : names?.tw;
              return (
                <div key={d.id} className="daily-hours-row">
                  <span className="dh-day">{dayName}</span>
                  <span className="dh-total">{d.totalHours}h</span>
                  <span className="dh-detail">
                    ORD:{d.ordHours} | OT:{d.otHours} | H:{d.holHours}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  const ResourceLinks = (
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
  );

  return (
    <div className="container">
      <header>
        <h1>{t.title}</h1>
        <div className="header-right">
          <button className="reset-header-btn" onClick={() => setShowResetModal(true)}>
            <span className="desktop-text">{t.resetBtn}</span>
            <span className="mobile-text">{t.resetBtnShort}</span>
          </button>
          <button className="lang-toggle-circle" onClick={() => setLang(lang === 'en' ? 'tw' : 'en')}>
            {lang === 'en' ? '中' : 'EN'}
          </button>
        </div>
      </header>

      <MainView
        t={t} lang={lang} records={records} updateRecord={updateRecord}
        showRules={showRules} setShowRules={setShowRules} renderRuleContent={renderRuleContent}
        Sidebar={SidebarContent}
        ResourceLinks={ResourceLinks}
      />

      {showResetModal && (
        <ResetModal t={t} onConfirm={() => { resetAllData(); setShowResetModal(false); }} onCancel={() => setShowResetModal(false)} />
      )}

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
            <span className="v-tag-small">v1.7.7</span>
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
