const translationsCache: Record<string, any> = {};

export interface TranslationMap {
  [key: string]: string | TranslationMap;
}

let availableTranslations: Record<string, TranslationMap> = {};

try {
  const enTranslations = require('./translations/en').default;
  availableTranslations.en = enTranslations;
  
  try { availableTranslations.zh = require('./translations/zh').default; } catch (e) {}
  try { availableTranslations.ph = require('./translations/ph').default; } catch (e) {}
} catch (e) {
  console.warn('Could not load default translations');
  availableTranslations.en = {};
}

export function registerTranslation(lang: string, translations: TranslationMap): void {
  availableTranslations[lang] = translations;
  delete translationsCache[lang];
}

export function clearTranslations(): void {
  availableTranslations = {};
  Object.keys(translationsCache).forEach(k => delete translationsCache[k]);
}

function loadTranslation(lang: string): TranslationMap {
  try {
    if (translationsCache[lang]) {
      return translationsCache[lang];
    }

    if (availableTranslations[lang]) {
      translationsCache[lang] = availableTranslations[lang];
      return availableTranslations[lang];
    }
    
    const baseLang = lang.split('-')[0];
    if (baseLang !== lang) {
      const baseTranslations = getTranslations(baseLang);
      translationsCache[lang] = baseTranslations;
      return baseTranslations;
    }
    
    if (lang !== 'en') {
      const englishTranslations = getTranslations('en');
      translationsCache[lang] = englishTranslations;
      return englishTranslations;
    }
    
    const emptyTranslations = {};
    translationsCache[lang] = emptyTranslations;
    return emptyTranslations;
  } catch (error) {
    console.error(`Error loading translation for ${lang}:`, error);
    return {};
  }
}

export function getTranslations(lang: string = 'en'): TranslationMap {
  return loadTranslation(lang);
}

export function translate(key: string, lang: string = 'en', placeholders: Record<string, string> = {}): string {
  const translations = getTranslations(lang);
  
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (!value || typeof value !== 'object') {
      return key;
    }
    value = value[k];
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  return Object.entries(placeholders).reduce(
    (str, [placeholder, val]) => str.replace(new RegExp(`{{${placeholder}}}`, 'g'), val),
    value
  );
} 