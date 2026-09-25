import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function Modal({
  open,
  onClose,
  children,
  variant = 'center',
  title,
  closable = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: 'center' | 'sheet';
  title?: ReactNode;
  closable?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-40 flex bg-slate-950/60 backdrop-blur-sm ${
            variant === 'sheet' ? 'items-end justify-center' : 'items-center justify-center p-4'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closable ? onClose : undefined}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={
              variant === 'sheet'
                ? 'relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border-x-[3px] border-t-[3px] border-ink bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-800 shadow-2xl'
                : 'toon relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-white p-6 text-slate-800'
            }
            initial={variant === 'sheet' ? { y: '100%' } : { scale: 0.85, opacity: 0 }}
            animate={variant === 'sheet' ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={variant === 'sheet' ? { y: '100%' } : { scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {variant === 'sheet' && <div aria-hidden className="mx-auto -mt-1 mb-3 h-1.5 w-14 rounded-full bg-slate-300" />}
            {(title || closable) && (
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="text-2xl font-black">{title}</div>
                {closable && (
                  <button
                    type="button"
                    aria-label="關閉"
                    onClick={onClose}
                    className="-mr-2 -mt-2 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                  >
                    <X size={32} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 不可逆動作一律二次確認（spec §8.3） */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '確定',
  cancelText = '先不要',
  danger,
  busy,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {message && <div className="mb-5 text-xl leading-relaxed text-slate-600">{message}</div>}
      {children}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={busy}>
          {cancelText}
        </Button>
        <Button variant={danger ? 'danger' : 'success'} size="lg" onClick={onConfirm} disabled={busy}>
          {busy ? '…' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
