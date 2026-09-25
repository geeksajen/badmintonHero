import { useCallback, useState } from 'react';
import { useToast } from '../ui/toastContext';

/** 包一層：執行中鎖按鈕、成功／失敗跳 toast */
export function useRun() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<unknown>, okText?: string) => {
      setBusy(true);
      try {
        await fn();
        if (okText) toast(okText);
        return true;
      } catch (e) {
        toast((e as Error).message || '發生錯誤', 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}
