import dayjs from 'dayjs'
import defaultLang from './lang/en'

export type TranslatePair = {
  [key: string]: string | string[] | TranslatePair
}

export type Language = {
  name: string
  el: TranslatePair
}

let lang: Language = defaultLang as Language

let i18nHandler: null | ((...args: any[]) => string) = null

export const i18n = (fn: (...args: any[]) => string) => {
  i18nHandler = fn
}

function template(str: string, option) {
  if(!str || !option) return str

  return str.replace(/\{(\w+)\}/g, (_, key) => {
    return option[key]
  })
}

const defaultTranslator = (...args: any[]) => {
  const [path, option] = args
  let value
  const array = path.split('.')
  let current = lang
  for (let i = 0, j = array.length; i < j; i++) {
    const property = array[i]
    value = current[property]
    if (i === j - 1) return template(value, option)
    if (!value) return ''
    current = value
  }
}

export const t = (...args: any[]): string => {
  if (i18nHandler) {
    const translation = i18nHandler(...args)
    if (!translation) {
      return defaultTranslator(...args)
    }
  }
  return defaultTranslator(...args)
}

export const use = (l: Language): void => {
  lang = l || lang
  if (lang.name) {
    dayjs.locale(lang.name)
  }
}

export const setLocale = use
