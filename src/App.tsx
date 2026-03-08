import { useState, useEffect } from 'react';
import './App.css';
import { usePayslip } from './hooks/usePayslip';
import { tw } from './locales/tw';
import { en } from './locales/en';
import { formatPaySummary } from './utils/formatters';
import { ResetModal } from './components/ResetModal';
import { DesktopView } from './components/DesktopView';
import { MobileView } from './components/MobileView';

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
    results, dailyLimit, resetAllData 
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
      <p className="note highlight">• <strong>Daily Cap: {dailyLimit}h</strong> – {t.rule_limit}</p>
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

  const SidebarContent = (
    <>
      <div className="sidebar-card">
        <h3 className="section-title">{t.rate}</h3>
        <div className="rate-setting-group">
          <div className="setting-row">
            <label className="setting-label">{t.hourlyRateLabel}</label>
            <div className="input-with-symbol">
              <span>$</span>
              <input type="number" step="0.01" value={hourlyRate || ''} onFocus={(e) => e.target.select()} onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="setting-row">
            <label className="setting-label">{t.minEngLabel}</label>
            <div className="input-with-symbol mini">
              <input type="number" step="0.5" value={minEngagement || ''} onFocus={(e) => e.target.select()} onChange={(e) => setMinEngagement(parseFloat(e.target.value) || 0)} />
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

      <div className="summary-card flat-block">
        <h3 className="section-title">{t.summary}</h3>
        <div className="result-grid">
          <div className="res-item">
            <span className="res-label">{t.ord}</span>
            <div className="res-combined">
              <span className="res-hours">{results.totalOrdinary.toFixed(2)}h</span>
              <span className="res-amount">(${results.payOrdinary.toLocaleString(undefined, {minimumFractionDigits: 2})})</span>
            </div>
          </div>
          <div className="res-item">
            <span className="res-label">{t.ot15}</span>
            <div className="res-combined">
              <span className="res-hours">{results.totalOT15.toFixed(2)}h</span>
              <span className="res-amount">(${results.payOT15.toLocaleString(undefined, {minimumFractionDigits: 2})})</span>
            </div>
          </div>
          <div className="res-item">
            <span className="res-label">{t.ot20}</span>
            <div className="res-combined">
              <span className="res-hours">{results.totalOT20.toFixed(2)}h</span>
              <span className="res-amount">(${results.payOT20.toLocaleString(undefined, {minimumFractionDigits: 2})})</span>
            </div>
          </div>
          <div className="res-item">
            <span className="res-label">{t.hol}</span>
            <div className="res-combined">
              <span className="res-hours">{results.totalHoliday.toFixed(2)}h</span>
              <span className="res-amount">(${results.payHoliday.toLocaleString(undefined, {minimumFractionDigits: 2})})</span>
            </div>
          </div>
          <div className="separator-line"></div>
          <div className="res-item accent-row">
            <span className="res-label">{t.gross}</span>
            <strong className={`res-val-uniform ${isPulsing ? 'gross-pulse' : ''}`}>
              ${results.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </strong>
          </div>
          <div className="res-item">
            <span className="res-label">{t.super} (OTE)</span>
            <strong className="res-val-uniform">${results.superGuarantee.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
          </div>
        </div>
        <button className={`copy-summary-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? t.copyDone : t.copyBtn}
        </button>
      </div>

      <div className="resource-links desktop-only-block">
        <a href="https://www.fairwork.gov.au/" target="_blank" rel="noreferrer" className="fw-link-card">
           <span className="link-title">{t.fwo_site}</span>
           <span className="link-arrow">→</span>
        </a>
        <a href="https://calculate.fairwork.gov.au/FindYourAward" target="_blank" rel="noreferrer" className="fw-link-card highlight-link">
           <span className="link-title">{t.fwo_calc}</span>
           <span className="link-arrow">→</span>
        </a>
      </div>
    </>
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

      <DesktopView 
        t={t} lang={lang} records={records} updateRecord={updateRecord} 
        showRules={showRules} setShowRules={setShowRules} renderRuleContent={renderRuleContent}
        Sidebar={SidebarContent}
      />

      <MobileView 
        t={t} lang={lang} records={records} updateRecord={updateRecord} 
        showRules={showRules} setShowRules={setShowRules} renderRuleContent={renderRuleContent}
        Sidebar={SidebarContent}
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
            <span className="v-tag-small">v1.7.1</span>
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
