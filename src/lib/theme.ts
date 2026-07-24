// ------------------------------------------------------------------
// Tarot theme system — preset palettes + color helpers
// ------------------------------------------------------------------

export type ThemeVarKey =
  | "--c-bg"
  | "--c-bg-alt"
  | "--c-surface"
  | "--c-ink"
  | "--c-ink-soft"
  | "--c-muted"
  | "--c-accent"
  | "--c-accent-2"
  | "--c-gold"
  | "--c-teal"
  | "--c-line";

export type Palette = Record<ThemeVarKey, string>;

export interface ThemePreset {
  id: string;
  name: string;
  tagline: string;
  mood: "light" | "dark";
  radius: number; // rem
  palette: Palette;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "aurora",
    name: "Arcano Carmesí",
    tagline: "Azul marino, carmesí & oro ritual",
    mood: "dark",
    radius: 0.9,
    palette: {
      "--c-bg": "222 37% 19%",
      "--c-bg-alt": "0 13% 9%",
      "--c-surface": "0 13% 9%",
      "--c-ink": "40 37% 92%",
      "--c-ink-soft": "33 59% 77%",
      "--c-muted": "33 28% 67%",
      "--c-accent": "352 64% 33%",
      "--c-accent-2": "352 64% 26%",
      "--c-gold": "46 67% 47%",
      "--c-teal": "46 67% 47%",
      "--c-line": "46 67% 47%",
    },
  },
  {
    id: "meia-noite",
    name: "Meia-Noite",
    tagline: "Índigo profundo & ouro velho",
    mood: "dark",
    radius: 1,
    palette: {
      "--c-bg": "263 38% 9%",
      "--c-bg-alt": "264 34% 13%",
      "--c-surface": "264 32% 16%",
      "--c-ink": "40 62% 92%",
      "--c-ink-soft": "275 22% 80%",
      "--c-muted": "272 12% 64%",
      "--c-accent": "38 92% 62%",
      "--c-accent-2": "22 85% 58%",
      "--c-gold": "43 80% 66%",
      "--c-teal": "172 45% 55%",
      "--c-line": "268 24% 26%",
    },
  },
  {
    id: "rosa",
    name: "Rosa Mística",
    tagline: "Quartzo rosa & coral suave",
    mood: "light",
    radius: 1.1,
    palette: {
      "--c-bg": "350 52% 97%",
      "--c-bg-alt": "348 56% 95%",
      "--c-surface": "350 60% 99%",
      "--c-ink": "330 45% 22%",
      "--c-ink-soft": "335 22% 40%",
      "--c-muted": "335 12% 56%",
      "--c-accent": "342 78% 63%",
      "--c-accent-2": "12 82% 66%",
      "--c-gold": "30 80% 78%",
      "--c-teal": "318 42% 58%",
      "--c-line": "345 34% 89%",
    },
  },
  {
    id: "floresta",
    name: "Floresta Sábia",
    tagline: "Salva verde & esmeralda",
    mood: "light",
    radius: 0.7,
    palette: {
      "--c-bg": "96 30% 96%",
      "--c-bg-alt": "100 32% 93%",
      "--c-surface": "90 44% 99%",
      "--c-ink": "158 42% 15%",
      "--c-ink-soft": "160 20% 30%",
      "--c-muted": "150 10% 46%",
      "--c-accent": "158 56% 42%",
      "--c-accent-2": "172 60% 40%",
      "--c-gold": "44 70% 64%",
      "--c-teal": "168 44% 44%",
      "--c-line": "110 24% 84%",
    },
  },
  {
    id: "estelar",
    name: "Véu Estelar",
    tagline: "Céu nocturno & violeta astral",
    mood: "dark",
    radius: 1.2,
    palette: {
      "--c-bg": "226 44% 10%",
      "--c-bg-alt": "225 40% 14%",
      "--c-surface": "224 38% 17%",
      "--c-ink": "210 42% 94%",
      "--c-ink-soft": "218 26% 80%",
      "--c-muted": "220 14% 64%",
      "--c-accent": "250 80% 72%",
      "--c-accent-2": "200 85% 62%",
      "--c-gold": "45 78% 70%",
      "--c-teal": "190 62% 58%",
      "--c-line": "224 30% 28%",
    },
  },
  {
    id: "ambar",
    name: "Âmbar",
    tagline: "Terracota & tijolo do deserto",
    mood: "light",
    radius: 0.6,
    palette: {
      "--c-bg": "32 52% 95%",
      "--c-bg-alt": "28 54% 92%",
      "--c-surface": "36 60% 98%",
      "--c-ink": "20 45% 20%",
      "--c-ink-soft": "22 26% 34%",
      "--c-muted": "24 14% 50%",
      "--c-accent": "18 82% 56%",
      "--c-accent-2": "6 72% 54%",
      "--c-gold": "36 82% 68%",
      "--c-teal": "158 34% 42%",
      "--c-line": "30 34% 84%",
    },
  },
];

export const DEFAULT_PRESET_ID = "aurora";

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

// ---------- color conversions ----------

/** "H S% L%" -> "#rrggbb" */
export function hslStrToHex(hsl: string): string {
  const [h, s, l] = hsl
    .replace(/%/g, "")
    .split(/\s+/)
    .map((n) => Number.parseFloat(n));
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** "#rrggbb" -> "H S% L%" */
export function hexToHslStr(hex: string): string {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const STORAGE_KEY = "tarot-theme-arcano-carmesi";
export const STORAGE_VARS_KEY = "tarot-theme-vars-arcano-carmesi";

export interface StoredTheme {
  presetId: string;
  overrides: Partial<Palette>;
  radius: number;
}

/** Build the full CSS-variable map (palette + radius) to write to :root */
export function resolveVars(
  presetId: string,
  overrides: Partial<Palette>,
  radius: number,
): Record<string, string> {
  const preset = getPreset(presetId);
  const palette: Palette = { ...preset.palette, ...overrides };
  const out: Record<string, string> = { "--radius": `${radius}rem` };
  for (const key of Object.keys(palette) as ThemeVarKey[]) {
    out[key] = palette[key];
  }
  return out;
}
