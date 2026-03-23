import { useState } from 'react';
import { getAwardById } from '../data/awards';
import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  awardId: string;
  currentHourlyRate: number;
  onUseAward: (awardId: string, hourlyRate: number) => void;
  onBack: () => void;
}

export function AwardDetailPage({ t, awardId, currentHourlyRate, onUseAward, onBack }: Props) {
  const award = getAwardById(awardId);

  const [selectedClassIdx, setSelectedClassIdx] = useState<number | null>(null);
  const [rateOverride, setRateOverride] = useState<number>(
    selectedClassIdx !== null && award && award.classifications[selectedClassIdx]
      ? award.classifications[selectedClassIdx].ratePerHour
      : currentHourlyRate
  );

  if (!award) return null;

  const handleClassSelect = (idx: number) => {
    setSelectedClassIdx(idx);
    setRateOverride(award.classifications[idx].ratePerHour);
  };

  const handleUseAward = () => {
    onUseAward(award.id, rateOverride);
  };

  return (
    <div className="award-detail-page">
      {/* Header */}
      <div className="award-detail-header">
        <button className="award-back-btn" onClick={onBack}>← {t.allAwards}</button>
        <button className="btn-use-award" onClick={handleUseAward}>{t.useThisAward} →</button>
      </div>

      <div className="award-detail-body">
        {/* Award title */}
        <div className="award-detail-title-card">
          {!award.isCustomEA && (
            <span className="award-ma-badge">{award.id}</span>
          )}
          <h2 className="award-detail-name">{award.name}</h2>
        </div>

        {/* Classification levels */}
        {award.classifications.length > 0 && (
          <div className="sidebar-card">
            <h3 className="section-title">{t.classificationLevel}</h3>
            <div className="classification-grid">
              {award.classifications.map((c, idx) => (
                <button
                  key={c.code}
                  className={`class-btn ${selectedClassIdx === idx ? 'class-btn-active' : ''}`}
                  onClick={() => handleClassSelect(idx)}
                >
                  <span className="class-code">{c.code}</span>
                  <span className="class-rate">${c.ratePerHour.toFixed(2)}</span>
                </button>
              ))}
            </div>
            {/* Rate override */}
            <div className="rate-override-row">
              <span className="lbl-small">{t.yourActualRate}</span>
              <div className="input-with-symbol mini">
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={rateOverride || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => setRateOverride(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="hint-text">{t.overrideHint}</p>
          </div>
        )}

        {/* Penalty Rates */}
        <div className="sidebar-card">
          <h3 className="section-title">{t.penaltyRates}</h3>
          <div className="penalty-grid">
            <PenaltyCard label="Saturday" value={
              award.satOT1LimitHours === 0
                ? `×${award.satOT1Multiplier}`
                : `×${award.satOT1Multiplier} (${award.satOT1LimitHours}h) → ×${award.satOT2Multiplier}`
            } />
            <PenaltyCard label="Sunday" value={`×${award.sunMultiplier}`} note={`min ${award.sunMinHours}h`} />
            <PenaltyCard label="Public Holiday" value={`×${award.phMultiplier}`} />
            <PenaltyCard
              label={`OT (first ${award.weekdayOT1LimitHours}h)`}
              value={`×${award.weekdayOT1Multiplier}`}
            />
            <PenaltyCard label="OT (after)" value={`×${award.weekdayOT2Multiplier}`} />
            {award.afternoonShiftMultiplier && (
              <PenaltyCard
                label="Afternoon Shift"
                value={`×${award.afternoonShiftMultiplier}`}
                note={t.notInCalculator}
                muted
              />
            )}
          </div>
        </div>

        {/* Break Rules */}
        <div className="sidebar-card">
          <h3 className="section-title">{t.breakRulesLabel}</h3>
          <table className="break-table">
            <thead>
              <tr>
                <th>{t.shiftDuration}</th>
                <th>{t.mealBreak}</th>
                <th>{t.restBreak}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: 'var(--label-color)' }}>Under {award.breakRules[0]?.shiftMinHours ?? 5}h</td>
                <td>—</td><td>—</td><td>—</td>
              </tr>
              {award.breakRules.map((rule, idx) => (
                <tr key={idx}>
                  <td>
                    {rule.shiftMinHours}h
                    {award.breakRules[idx + 1] ? ` – ${award.breakRules[idx + 1].shiftMinHours}h` : '+'}
                  </td>
                  <td>{rule.mealBreakMinutes > 0 ? `${rule.mealBreakMinutes} min` : '—'}</td>
                  <td>{rule.restBreakMinutes > 0 ? `${rule.restBreakMinutes} min` : '—'}</td>
                  <td>
                    {rule.restBreakMinutes > 0
                      ? <span className="tag-paid">{t.paid}</span>
                      : <span className="tag-unpaid">{t.unpaid}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Other Rules */}
        <div className="sidebar-card">
          <h3 className="section-title">{t.otherRules}</h3>
          <div className="other-rules-grid">
            <RuleChip label={t.minEngLabel} value={`${award.minEngagementHours}h`} />
            <RuleChip label="Standard Week" value={`${award.weeklyStandardHours}h`} />
            <RuleChip label={t.super} value={`${(award.superRate * 100).toFixed(0)}%`} />
            <RuleChip label="Casual Loading" value={`${(award.casualLoading * 100).toFixed(0)}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PenaltyCard({ label, value, note, muted }: {
  label: string; value: string; note?: string; muted?: boolean;
}) {
  return (
    <div className="penalty-card">
      <div className="penalty-label">{label}</div>
      <div className={`penalty-value ${muted ? 'penalty-muted' : ''}`}>{value}</div>
      {note && <div className="penalty-note">{note}</div>}
    </div>
  );
}

function RuleChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rule-chip">
      <div className="rule-chip-label">{label}</div>
      <div className="rule-chip-value">{value}</div>
    </div>
  );
}
