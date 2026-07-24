"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";

/**
 * Guard de cliente. Redirige a /login conservando la ruta de destino.
 *
 * Ojo: esto es UX, no seguridad. La protección real la hace el backend
 * rechazando peticiones sin access token válido; aquí solo se evita
 * enseñar una pantalla vacía a quien no tiene sesión.
 */
export function Protected({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") {
    return (
      <>
        {fallback ?? (
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent1" />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
