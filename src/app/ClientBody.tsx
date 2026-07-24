"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { VideoProvider } from "@/components/video/video-provider";

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
      <AuthProvider>
        <VideoProvider>
          <div className="antialiased">{children}</div>
        </VideoProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
