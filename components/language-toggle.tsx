'use client'

import { useLanguage } from '@/lib/i18n'

function UsFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <clipPath id="us-circle-clip">
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#us-circle-clip)">
        <rect width="32" height="32" fill="#B22234" />
        <g fill="#fff">
          <rect y="4.57" width="32" height="2.29" />
          <rect y="9.14" width="32" height="2.29" />
          <rect y="13.71" width="32" height="2.29" />
          <rect y="18.29" width="32" height="2.29" />
          <rect y="22.86" width="32" height="2.29" />
          <rect y="27.43" width="32" height="2.29" />
        </g>
        <path d="M16 2.5A13.5 13.5 0 0 0 2.5 16h13.5V2.5Z" fill="#3C3B6E" />
      </g>
    </svg>
  )
}

function MxFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <clipPath id="mx-circle-clip">
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#mx-circle-clip)">
        <rect x="0" width="10.67" height="32" fill="#006847" />
        <rect x="10.67" width="10.67" height="32" fill="#fff" />
        <rect x="21.33" width="10.67" height="32" fill="#CE1126" />
        <circle cx="16" cy="16" r="2.6" fill="#8B5E3C" />
      </g>
    </svg>
  )
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const isEs = language === 'es'

  return (
    <div id="language-toggle-container" className="flex items-center gap-1.5 text-xs font-semibold">
      <span className={isEs ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}>
        EN
      </span>
      <button
        type="button"
        role="switch"
        id="language-toggle"
        aria-checked={isEs}
        aria-label={isEs ? 'Switch to English' : 'Cambiar a español'}
        onClick={() => setLanguage(isEs ? 'en' : 'es')}
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span
          className={`absolute left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow transition-transform duration-200 ${
            isEs ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isEs ? <MxFlag className="h-5 w-5" /> : <UsFlag className="h-5 w-5" />}
        </span>
      </button>
      <span className={isEs ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}>
        ES
      </span>
    </div>
  )
}
