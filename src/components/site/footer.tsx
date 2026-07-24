"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { Logo } from "./header";
import { Sparkles, WhatsApp } from "./icons";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer id="trabalhe" className="scroll-mt-24 pt-16">
      {/* Work with us */}
      <div className="container-tarot">
        <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 rounded-2xl border border-accent1/30 bg-gradient-to-r from-gold/20 to-surface p-5 shadow-soft sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent1/15 text-accent1">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-serif text-lg text-ink">{t.footer.workTitle}</h3>
            <p className="text-sm text-ink-soft">{t.footer.workSub}</p>
          </div>
          <a href="#trabalhe" className="btn-flame shrink-0">
            <Sparkles className="h-4 w-4" /> {t.footer.candidatar}
          </a>
        </div>
      </div>

      {/* Footer body */}
      <div className="mt-14 border-t border-line bg-soft/50">
        <div className="container-tarot py-12 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <p className="mt-3 font-cinzel text-sm tracking-[0.3em] text-ink">
            {t.footer.appName}
          </p>
          <p className="mt-1 text-xs text-subtle">{t.footer.ageNote}</p>

          {/* search chips */}
          <p className="mt-8 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-subtle">
            {t.footer.procuraPor}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {t.footer.searchChips.map((chip) => (
              <a
                key={chip}
                href="#top"
                className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent1/50 hover:text-ink"
              >
                {chip}
              </a>
            ))}
          </div>

          {/* links */}
          <nav className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {t.footer.links.map((l) => (
              <a
                key={l}
                href="#top"
                className="text-ink-soft transition-colors hover:text-accent1"
              >
                {l}
              </a>
            ))}
          </nav>

          {/* contacts */}
          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-sm text-ink-soft sm:flex-row sm:gap-6">
            <a
              href="mailto:geral@tarot-online.com.pt"
              className="hover:text-accent1"
            >
              geral@tarot-online.com.pt
            </a>
            <a
              href="https://wa.me/351911924148"
              className="inline-flex items-center gap-1.5 hover:text-teal"
            >
              <WhatsApp className="h-4 w-4 text-teal" />
              WhatsApp +351 911 924 148
            </a>
          </div>

          <p className="mt-8 text-xs text-subtle">{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
