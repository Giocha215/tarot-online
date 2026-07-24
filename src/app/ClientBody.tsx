"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeCustomizer } from "@/components/theme/theme-customizer";
import { LanguageProvider } from "@/components/i18n/language-provider";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <div className="antialiased">{children}</div>
        <ThemeCustomizer />
      </ThemeProvider>
    </LanguageProvider>
  );
}
