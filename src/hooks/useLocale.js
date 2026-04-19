import { useCallback, useMemo } from 'react';
import Locale from "../locale/locale";

export const useLocale = () => {
  // Get locale string with fallback
  const getLocaleString = useCallback((stringName) => {
    const stringSegments = stringName.split("/");
    const stringLast = stringSegments.pop();

    // Primary: English
    let enFolder = Locale["en"].strings;
    for (const segment of stringSegments) {
      enFolder = enFolder[segment];
    }
    const enValue = enFolder ? enFolder[stringLast] : undefined;
    if (enValue !== null && enValue !== undefined) {
      return enValue;
    }

    // Fallback: Russian (legacy translations)
    let ruFolder = Locale["ru"].strings;
    for (const segment of stringSegments) {
      ruFolder = ruFolder[segment];
    }
    return ruFolder ? ruFolder[stringLast] : undefined;
  }, []);

  // Get locale string with parameters
  const getLocaleStringWithParams = useCallback((stringName, params = {}) => {
    let string = getLocaleString(stringName);
    
    // Replace parameters in the string
    Object.entries(params).forEach(([key, value]) => {
      string = string.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    return string;
  }, [getLocaleString]);

  // Get locale string with newlines
  const getLocaleStringWithNewlines = useCallback((stringName) => {
    const string = getLocaleString(stringName);
    return string ? string.replace(/\\n/g, '\n') : string;
  }, [getLocaleString]);

  // Available languages
  const availableLanguages = useMemo(() => {
    return Object.keys(Locale).map(code => ({
      code,
      name: Locale[code].name || code,
      flag: Locale[code].flag || '🏳️'
    }));
  }, []);

  return {
    getLocaleString,
    getLocaleStringWithParams,
    getLocaleStringWithNewlines,
    availableLanguages,
  };
};
