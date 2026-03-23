import { AWARDS, type AwardConfig } from '../data/awards';
import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  currentAwardId: string;
  onSelect: (awardId: string) => void;
  onViewDetail: (awardId: string) => void;
  onClose: () => void;
}

export function AwardSelector({ t, currentAwardId, onSelect, onViewDetail, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="award-selector-sheet" onClick={e => e.stopPropagation()}>
        <div className="award-selector-handle" />
        <div className="award-selector-header">
          <h3 className="section-title" style={{ margin: 0 }}>{t.awardLabel}</h3>
          <button className="modal-btn cancel" onClick={onClose}>✕</button>
        </div>
        <div className="award-selector-list">
          {AWARDS.map(award => (
            <AwardRow
              key={award.id}
              award={award}
              isActive={award.id === currentAwardId}
              onSelect={() => { onSelect(award.id); onClose(); }}
              onViewDetail={() => onViewDetail(award.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AwardRow({ award, isActive, onSelect, onViewDetail }: {
  award: AwardConfig;
  isActive: boolean;
  onSelect: () => void;
  onViewDetail: () => void;
}) {
  return (
    <div className={`award-row ${isActive ? 'award-row-active' : ''}`} onClick={onSelect}>
      <div className="award-row-dot" />
      <div className="award-row-info">
        <span className="award-row-name">{award.shortName}</span>
        {!award.isCustomEA && (
          <span className="award-row-ma">{award.id}</span>
        )}
      </div>
      {isActive && <span className="award-row-check">✓</span>}
      <button
        className="award-row-info-btn"
        onClick={e => { e.stopPropagation(); onViewDetail(); }}
        title="View details"
      >
        ⓘ
      </button>
    </div>
  );
}
