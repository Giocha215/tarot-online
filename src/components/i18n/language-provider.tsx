"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LANG,
  type Dict,
  type Lang,
  LANG_STORAGE_KEY,
  LOCALE_MAP,
  translations,
} from "@/lib/i18n";

interface LanguageContextValue {
  lang: Lang;
  locale: string;
  t: Dict;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
      if (saved && translations[saved]) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Refleja el idioma en el <html> para poder ajustar el CSS por idioma
  // (p. ej. el zoom del móvil en portugués).
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.uiLang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      locale: LOCALE_MAP[lang],
      t: translations[lang],
      setLang,
    }),
    [lang, setLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
