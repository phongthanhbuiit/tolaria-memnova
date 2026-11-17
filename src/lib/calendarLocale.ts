// DayPicker extends the installed date-fns locales with translated ARIA labels.
import { enUS, it, fr, de, ru, es, ptBR, pt, zhCN, zhTW, ja, ko, vi, pl, be, id } from 'react-day-picker/locale'
import type { DayPickerLocale } from 'react-day-picker'
import type { AppLocale } from './i18n'

export const calendarLocales: Record<AppLocale, DayPickerLocale> = {
  en: enUS,
  'it-IT': it,
  'fr-FR': fr,
  'de-DE': de,
  'ru-RU': ru,
  'es-ES': es,
  'pt-BR': ptBR,
  'pt-PT': pt,
  'es-419': es,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja-JP': ja,
  'ko-KR': ko,
  vi,
  'pl-PL': pl,
  'be-BY': be,
  'be-Latn': be,
  'id-ID': id,
}
