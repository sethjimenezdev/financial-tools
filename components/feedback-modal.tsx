'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

type FeedbackType = 'bug' | 'improvement' | 'other'
type Status = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_RE = /^\S+@\S+\.\S+$/
const MIN_NAME_LENGTH = 3
const MIN_COMMENT_LENGTH = 5

export function FeedbackModal() {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState<FeedbackType>('bug')
  const [comment, setComment] = useState('')
  const [website, setWebsite] = useState('')

  const open = () => {
    setIsOpen(true)
    requestAnimationFrame(() => setIsVisible(true))
  }

  const close = () => {
    setIsVisible(false)
    setTimeout(() => {
      setIsOpen(false)
      setStatus('idle')
      setSubmitted(false)
      setName('')
      setEmail('')
      setType('bug')
      setComment('')
      setWebsite('')
    }, 200)
  }

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(close, 1500)
    return () => clearTimeout(timer)
  }, [status])

  const nameValid = name.trim().length >= MIN_NAME_LENGTH && name.trim().length <= 120
  const emailValid = EMAIL_RE.test(email.trim()) && email.trim().length <= 254
  const commentValid = comment.trim().length >= MIN_COMMENT_LENGTH && comment.trim().length <= 2000
  const isValid = nameValid && emailValid && commentValid

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!isValid) {
      setStatus('error')
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, comment, website }),
      })
      if (!res.ok) throw new Error('request_failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <MessageSquare size={14} />
        {t.feedbackButtonLabel}
      </button>

      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 transition-opacity duration-200 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 sm:p-6 transition-all duration-200 ${
              isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="feedback-modal-title" className="text-base font-semibold">
                {t.feedbackModalTitle}
              </h2>
              <button
                type="button"
                aria-label={t.feedbackCloseAria}
                onClick={close}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {status === 'success' ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 py-4">{t.feedbackSuccessMessage}</p>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                <div
                  className="hidden"
                  aria-hidden="true"
                >
                  <label htmlFor="feedback-website">Website</label>
                  <input
                    id="feedback-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="feedback-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.feedbackNameLabel}
                  </label>
                  <input
                    id="feedback-name"
                    type="text"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                      submitted && !nameValid ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {submitted && !nameValid && (
                    <p className="text-xs text-red-500 dark:text-red-400">{t.feedbackErrorName}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="feedback-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.feedbackEmailLabel}
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                      submitted && !emailValid ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {submitted && !emailValid && (
                    <p className="text-xs text-red-500 dark:text-red-400">{t.feedbackErrorEmail}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="feedback-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.feedbackTypeLabel}
                  </label>
                  <select
                    id="feedback-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as FeedbackType)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="bug">{t.feedbackTypeBug}</option>
                    <option value="improvement">{t.feedbackTypeImprovement}</option>
                    <option value="other">{t.feedbackTypeOther}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="feedback-comment" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.feedbackCommentLabel}
                  </label>
                  <textarea
                    id="feedback-comment"
                    required
                    rows={4}
                    maxLength={2000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className={`rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                      submitted && !commentValid ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {submitted && !commentValid && (
                    <p className="text-xs text-red-500 dark:text-red-400">{t.feedbackErrorComment}</p>
                  )}
                </div>

                {status === 'error' && isValid && (
                  <p className="text-sm text-red-500 dark:text-red-400">{t.feedbackErrorMessage}</p>
                )}

                <button
                  type="submit"
                  id="feedback-submit-btn"
                  disabled={status === 'submitting'}
                  className="mt-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? t.feedbackSubmittingLabel : t.feedbackSubmitLabel}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
