'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from './config'
import type { Messages } from './messages/en'

type I18nContextValue = {
  locale: Locale
  messages: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  locale,
  messages,
  children,
}: I18nContextValue & { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

export function useT(): Messages {
  return useI18n().messages
}

export function useLocale(): Locale {
  return useI18n().locale
}
