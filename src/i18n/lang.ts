import { useCallback, useSyncExternalStore } from 'react';
import { Language } from '../types';
import { getStoredLanguage, setStoredLanguage } from './index';

// Joriy til butun ilova uchun bitta: istalgan komponent useL() orqali o'qiydi,
// til almashganda hammasi birdaniga qayta chiziladi.
let current: Language = typeof window === 'undefined' ? 'uz' : getStoredLanguage();
const listeners = new Set<() => void>();

export function setLanguage(language: Language): void {
  current = language;
  setStoredLanguage(language);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** L("O'zbekcha matn", "Русский текст") — joriy tildagi variantni qaytaradi */
export function useL() {
  const language = useLanguage();
  return useCallback((uz: string, ru: string) => (language === 'ru' ? ru : uz), [language]);
}

export const MONTHS = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
};

/** Server "Oktyabr 2026" kabi o'zbekcha oy nomini yuboradi — rus tilida tarjima qilamiz */
export function localizeMonth(text: string, language: Language): string {
  if (language !== 'ru' || !text) return text;
  return MONTHS.uz.reduce((acc, name, i) => acc.replace(name, MONTHS.ru[i]), text);
}

export const money = (n: number | undefined) => `$${Math.round(n || 0).toLocaleString('en-US')}`;
