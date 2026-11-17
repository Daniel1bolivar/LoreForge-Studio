import type { Locale } from '../types';
import es from './es.json';
import en from './en.json';

type Dictionary = Record<string, unknown>;

const dictionaries: Record<Locale, Dictionary> = {
  es: es as Dictionary,
  en: en as Dictionary,
};

let currentLocale: Locale = 'es';

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

function resolveKey(dict: Dictionary, key: string): string | undefined {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const raw =
    resolveKey(dictionaries[currentLocale], key) ??
    resolveKey(dictionaries.es, key) ??
    key;
  if (!params) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) =>
    varName in params ? String(params[varName]) : `{{${varName}}}`
  );
}
