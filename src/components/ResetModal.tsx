import { type Translation } from '../locales/tw';

interface Props {
  t: Translation;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetModal({ t, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card-glow">
        <h3>{t.resetConfirmTitle}</h3>
        <p>{t.resetConfirmDesc}</p>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onCancel}>
            {t.cancel}
          </button>
          <button className="modal-btn confirm" onClick={onConfirm}>
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
