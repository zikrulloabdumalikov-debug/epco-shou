import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useL } from '../i18n/lang';

interface SheetProps {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Telefonda pastdan chiqadigan oyna; kompyuterda markazda. Fonni bosish yoki Esc yopadi. */
export const Sheet: React.FC<SheetProps> = ({ open, title, onClose, children, footer }) => {
  const L = useL();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 pb-3">
          <h3 className="text-xl font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="icon-btn shrink-0" aria-label={L('Yopish', 'Закрыть')}>
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar -mx-1 px-1 pb-2">{children}</div>
        {footer && <div className="pt-3">{footer}</div>}
      </div>
    </div>
  );
};
