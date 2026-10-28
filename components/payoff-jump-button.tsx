'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface PayoffJumpButtonProps {
  visible: boolean;
  targetPaymentNumber: number | null;
  /** Reveals the target row (e.g. expands its year) and scrolls to it. */
  onReveal?: (paymentNumber: number) => void;
}

function getPayoffRowElement(paymentNumber: number): HTMLElement | null {
  const desktop = document.getElementById(`payment-row-desktop-${paymentNumber}`);
  if (desktop && desktop.offsetParent !== null) return desktop;
  const mobile = document.getElementById(`payment-row-mobile-${paymentNumber}`);
  if (mobile && mobile.offsetParent !== null) return mobile;
  return null;
}

export function PayoffJumpButton({ visible, targetPaymentNumber, onReveal }: PayoffJumpButtonProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'toPayoff' | 'toTop'>('toPayoff');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible || targetPaymentNumber === null) return;

    const updateMode = () => {
      const el = getPayoffRowElement(targetPaymentNumber);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMode(rect.top <= window.innerHeight / 2 ? 'toTop' : 'toPayoff');
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateMode();
      });
    };

    updateMode();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, targetPaymentNumber]);

  if (!visible || targetPaymentNumber === null) return null;

  const handleClick = () => {
    if (mode === 'toTop') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (onReveal) {
      onReveal(targetPaymentNumber);
      return;
    }
    getPayoffRowElement(targetPaymentNumber)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={mode === 'toTop' ? t.backToTopAria : t.jumpToPayoffRowAria}
      className="fixed bottom-6 right-6 z-40 rounded-full bg-indigo-600 p-3 text-white shadow-lg hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
    >
      {mode === 'toTop' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
    </button>
  );
}
