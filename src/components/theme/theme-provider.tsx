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
  DEFAULT_PRESET_ID,
  getPreset,
  type Palette,
  resolveVars,
  STORAGE_KEY,
  STORAGE_VARS_KEY,
  type StoredTheme,
  type ThemeVarKey,
} from "@/lib/theme";

interface ThemeContextValue {
  presetId: string;
  overrides: Partial<Palette>;
  radius: number;
  isCustomized: boolean;
  applyPreset: (id: string) => void;
  setColor: (key: ThemeVarKey, hsl: string) => void;
  setRadius: (r: number) => void;
  resetToPreset: () => void;
  getValue: (key: ThemeVarKey) => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function writeToDocument(
  presetId: string,
  overrides: Partial<Palette>,
  radius: number,
) {
  const vars = resolveVars(presetId, overrides, radius);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  try {
    localStorage.setItem(STORAGE_VARS_KEY, JSON.stringify(vars));
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [overrides, setOverrides] = useState<Partial<Palette>>({});
  const [radius, setRadiusState] = useState(getPreset(DEFAULT_PRESET_ID).radius);
  const [hydrated, setHydrated] = useState(false);

  // Load saved theme once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StoredTheme;
        setPresetId(saved.presetId ?? DEFAULT_PRESET_ID);
        setOverrides(saved.overrides ?? {});
        setRadiusState(
          saved.radius ?? getPreset(saved.presetId ?? DEFAULT_PRESET_ID).radius,
        );
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist + apply on any change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    writeToDocument(presetId, overrides, radius);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ presetId, overrides, radius } satisfies StoredTheme),
      );
    } catch {
      /* ignore */
    }
  }, [presetId, overrides, radius, hydrated]);

  const applyPreset = useCallback((id: string) => {
    setPresetId(id);
    setOverrides({});
    setRadiusState(getPreset(id).radius);
  }, []);

  const setColor = useCallback((key: ThemeVarKey, hsl: string) => {
    setOverrides((prev) => ({ ...prev, [key]: hsl }));
  }, []);

  const setRadius = useCallback((r: number) => setRadiusState(r), []);

  const resetToPreset = useCallback(() => {
    setOverrides({});
    setRadiusState(getPreset(presetId).radius);
  }, [presetId]);

  const getValue = useCallback(
    (key: ThemeVarKey) => overrides[key] ?? getPreset(presetId).palette[key],
    [overrides, presetId],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      presetId,
      overrides,
      radius,
      isCustomized:
        Object.keys(overrides).length > 0 ||
        radius !== getPreset(presetId).radius,
      applyPreset,
      setColor,
      setRadius,
      resetToPreset,
      getValue,
    }),
    [
      presetId,
      overrides,
      radius,
      applyPreset,
      setColor,
      setRadius,
      resetToPreset,
      getValue,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
