import languages from "../data/languages.json";

export type LanguageCode = keyof typeof languages;

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function getPrayerLanguage(language: LanguageCode) {
  return languages[language].prayer;
}

export function isLanguageSupported(
  language: string,
): language is LanguageCode {
  return language in languages;
}
