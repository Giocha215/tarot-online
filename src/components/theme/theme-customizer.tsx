"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  hexToHslStr,
  hslStrToHex,
  THEME_PRESETS,
  type ThemeVarKey,
} from "@/lib/theme";
import { useLanguage } from "@/components/i18n/language-provider";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

type FieldKey =
  | "accent"
  | "accent2"
  | "gold"
  | "teal"
  | "bg"
  | "surface"
  | "ink";

const COLOR_FIELDS: { key: ThemeVarKey; field: FieldKey }[] = [
  { key: "--c-accent", field: "accent" },
  { key: "--c-accent-2", field: "accent2" },
  { key: "--c-gold", field: "gold" },
  { key: "--c-teal", field: "teal" },
  { key: "--c-bg", field: "bg" },
  { key: "--c-surface", field: "surface" },
  { key: "--c-ink", field: "ink" },
];

function PresetSwatch({
  active,
  onClick,
  name,
  tagline,
  colors,
}: {
  active: boolean;
  onClick: () => void;
  name: string;
  tagline: string;
  colors: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
        active
          ? "border-accent1 shadow-glow"
          : "border-line hover:border-accent1/60",
      )}
    >
      <div className="mb-2 flex gap-1">
        {colors.map((c) => (
          <span
            key={c}
            className="h-6 w-full rounded-md"
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="font-serif text-sm font-semibold leading-tight text-ink">
        {name}
      </div>
      <div className="text-[0.68rem] leading-tight text-subtle">{tagline}</div>
      {active && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent1 text-[10px] text-ink-soft">
          ✓
        </span>
      )}
    </button>
  );
}

function ColorRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (hsl: string) => void;
}) {
  const hex = hslStrToHex(value);
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-base/40 px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="truncate text-[0.68rem] text-subtle">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.7rem] uppercase text-subtle">
          {hex}
        </span>
        <span
          className="relative h-8 w-8 overflow-hidden rounded-full border border-line shadow-inner"
          style={{ background: `hsl(${value})` }}
        >
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(hexToHslStr(e.target.value))}
            className="absolute inset-0 h-[200%] w-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0"
            aria-label={label}
          />
        </span>
      </div>
    </label>
  );
}

export function ThemeCustomizer() {
  const { t } = useLanguage();
  const tt = t.theme;
  const presetNames = tt.presets as Record<
    string,
    { name: string; tagline: string }
  >;
  const [open, setOpen] = useState(false);
  const {
    presetId,
    radius,
    isCustomized,
    applyPreset,
    setColor,
    setRadius,
    resetToPreset,
    getValue,
  } = useTheme();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-theme", handler);
    return () => window.removeEventListener("open-theme", handler);
  }, []);

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tt.title}
        className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-ink-soft shadow-glow transition-transform hover:scale-105 active:scale-95"
        style={{
          backgroundImage:
            "linear-gradient(135deg, hsl(var(--c-accent-2)), hsl(var(--c-accent)))",
        }}
      >
        <PaletteIcon className="h-6 w-6" />
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-ink-soft/30" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-[400px] overflow-y-auto border-line bg-base p-0 sm:max-w-[400px]"
        >
          <SheetHeader className="border-b border-line bg-surface/60 px-5 py-5 text-left backdrop-blur">
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--c-accent-2)), hsl(var(--c-accent)))",
                }}
              >
                <PaletteIcon className="h-5 w-5" />
              </span>
              <div>
                <SheetTitle className="font-serif text-xl text-ink">
                  {tt.title}
                </SheetTitle>
                <SheetDescription className="text-xs text-subtle">
                  {tt.subtitle}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-7 px-5 py-6">
            {/* Presets */}
            <section>
              <SectionTitle>{tt.atmosferas}</SectionTitle>
              <div className="grid grid-cols-2 gap-2.5">
                {THEME_PRESETS.map((p) => (
                  <PresetSwatch
                    key={p.id}
                    active={presetId === p.id && !isCustomized}
                    onClick={() => applyPreset(p.id)}
                    name={presetNames[p.id]?.name ?? p.name}
                    tagline={presetNames[p.id]?.tagline ?? p.tagline}
                    colors={[
                      `hsl(${p.palette["--c-bg"]})`,
                      `hsl(${p.palette["--c-accent"]})`,
                      `hsl(${p.palette["--c-accent-2"]})`,
                      `hsl(${p.palette["--c-ink"]})`,
                    ]}
                  />
                ))}
              </div>
            </section>

            {/* Colors */}
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <SectionTitle className="mb-0">{tt.cores}</SectionTitle>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={resetToPreset}
                    className="text-xs font-medium text-accent1 hover:underline"
                  >
                    {tt.repor}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {COLOR_FIELDS.map((f) => (
                  <ColorRow
                    key={f.key}
                    label={tt.fields[f.field].label}
                    hint={tt.fields[f.field].hint}
                    value={getValue(f.key)}
                    onChange={(hsl) => setColor(f.key, hsl)}
                  />
                ))}
              </div>
            </section>

            {/* Radius */}
            <section>
              <SectionTitle>
                {tt.cantos} · {radius.toFixed(2)}rem
              </SectionTitle>
              <Slider
                value={[radius]}
                min={0}
                max={1.6}
                step={0.05}
                onValueChange={([v]) => setRadius(v)}
                className="py-2"
              />
              <div className="flex justify-between text-[0.68rem] text-subtle">
                <span>{tt.rectos}</span>
                <span>{tt.suaves}</span>
              </div>
            </section>

            {/* Live preview */}
            <section>
              <SectionTitle>{tt.preview}</SectionTitle>
              <div className="card-mystic space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-teal">
                    {tt.semEspera}
                  </span>
                  <span className="font-serif text-lg text-ink">Carmen</span>
                </div>
                <p className="text-sm text-ink-soft">
                  {tt.previewLine}{" "}
                  <span className="serif-accent">{tt.previewAccent}</span>{" "}
                  {tt.previewRest}
                </p>
                <button type="button" className="btn-flame w-full">
                  <SparkIcon className="h-4 w-4" /> {tt.revealCard}
                </button>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h4
      className={cn(
        "mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-subtle",
        className,
      )}
    >
      {children}
    </h4>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.6-.2-1.1-.6-1.5-.4-.4-.6-.9-.6-1.5A2.5 2.5 0 0 1 15.8 14H18a4 4 0 0 0 4-4c0-4.4-4.5-8-10-8Z" />
      <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
    </svg>
  );
}
