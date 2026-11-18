import { createContext } from 'react'
import type { AppLocale } from '../lib/i18n'

export const DrawingSourceContext = createContext<{ locale: AppLocale; openSource: () => void } | null>(null)
