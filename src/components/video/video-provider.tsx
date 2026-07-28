"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import * as api from "@/lib/auth/api-client";
import type { StartSessionResult } from "@/lib/auth/api-client";
import { ApiError } from "@/lib/auth/types";
import { VideoOverlay } from "./video-overlay";

/** Duraciones ofrecidas (deben coincidir con ALLOWED_DURATIONS del backend).
 *  El 1 es solo para la demo. */
export const DURATIONS = [1, 15, 30, 45, 60] as const;

/**
 * Fases del flujo:
 *  - idle: nada abierto
 *  - auth: modal "inicia sesión" (usuario no logueado)
 *  - choose: modal de duración + saldo
 *  - active: videollamada en curso con temporizador
 *  - ended: popup "la sesión ha terminó"
 */
type Phase = "idle" | "auth" | "choose" | "active" | "ended";

interface PendingConsultant {
  slug: string;
  name: string;
  priceCentsPerMinute: number;
  /** Canal de la consulta: videollamada o chat en vivo. */
  channel: "video" | "chat";
}

interface VideoContextValue {
  phase: Phase;
  pending: PendingConsultant | null;
  active: StartSessionResult | null;
  balanceCents: number;
  starting: boolean;
  errorCode: string | null;
  /** Punto de entrada desde el botón "Videollamada". */
  requestCall: (c: PendingConsultant) => void;
  confirmStart: (durationMin: number) => Promise<void>;
  topup: (amountCents: number) => Promise<void>;
  endCall: () => Promise<void>;
  dismiss: () => void;
  goLogin: () => void;
  goRegister: () => void;
}

const VideoContext = createContext<VideoContextValue | null>(null);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, reload } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState<PendingConsultant | null>(null);
  const [active, setActive] = useState<StartSessionResult | null>(null);
  const [balanceCents, setBalanceCents] = useState(0);
  const [starting, setStarting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // El saldo se siembra del perfil y se actualiza en cada cargo/recarga.
  useEffect(() => {
    if (user) setBalanceCents(user.balanceCents);
  }, [user]);

  // Al cargar con sesión, rehidrata una videollamada en curso (p. ej. tras
  // recargar la página): el temporizador sigue donde estaba.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    api
      .fetchActiveSession()
      .then(({ session }) => {
        if (cancelled || !session) return;
        if (new Date(session.expiresAt).getTime() <= Date.now()) return;
        setActive({
          sessionId: session.id,
          channel: session.channel === "chat" ? "chat" : "video",
          joinUrl: session.joinUrl,
          embeddable: session.embeddable,
          durationMin: session.durationMin,
          totalCents: session.totalCents,
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
          balanceCents: user?.balanceCents ?? 0,
          consultant: {
            slug: session.consultantSlug,
            name: session.consultantName,
          },
        });
        setPhase("active");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.balanceCents]);

  const requestCall = useCallback(
    (c: PendingConsultant) => {
      setErrorCode(null);
      setPending(c);
      // Punto 1 del flujo: verificar login antes de nada.
      setPhase(isAuthenticated ? "choose" : "auth");
    },
    [isAuthenticated],
  );

  const confirmStart = useCallback(
    async (durationMin: number) => {
      if (!pending) return;
      setStarting(true);
      setErrorCode(null);
      try {
        const result = await api.startSession({
          consultantSlug: pending.slug,
          durationMin,
          channel: pending.channel,
        });
        setActive(result);
        setBalanceCents(result.balanceCents);
        setPhase("active");
        // Vídeo con sala externa (Teams): abrir en pestaña nueva. El chat no
        // tiene joinUrl, así que este bloque no aplica.
        if (result.channel === "video" && result.joinUrl) {
          window.open(result.joinUrl, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorCode(err.code);
          // 402 → mantener el modal para ofrecer recarga.
          if (err.code !== "INSUFFICIENT_BALANCE") setPhase("choose");
        } else {
          setErrorCode("NETWORK");
        }
      } finally {
        setStarting(false);
      }
    },
    [pending],
  );

  const topup = useCallback(
    async (amountCents: number) => {
      try {
        const { balanceCents: nb } = await api.topupWallet(amountCents);
        setBalanceCents(nb);
        setErrorCode(null);
        void reload(); // refresca el saldo del perfil
      } catch {
        setErrorCode("NETWORK");
      }
    },
    [reload],
  );

  const endCall = useCallback(async () => {
    if (!active) {
      setPhase("idle");
      return;
    }
    try {
      await api.endSession(active.sessionId, "completed");
    } catch {
      /* aunque falle, localmente se cierra */
    }
    setPhase("ended");
    void reload();
  }, [active, reload]);

  const dismiss = useCallback(() => {
    setPhase("idle");
    setPending(null);
    setActive(null);
    setErrorCode(null);
  }, []);

  const goLogin = useCallback(() => {
    dismiss();
    router.push("/login?next=/");
  }, [dismiss, router]);

  const goRegister = useCallback(() => {
    dismiss();
    router.push("/registro");
  }, [dismiss, router]);

  const value = useMemo<VideoContextValue>(
    () => ({
      phase,
      pending,
      active,
      balanceCents,
      starting,
      errorCode,
      requestCall,
      confirmStart,
      topup,
      endCall,
      dismiss,
      goLogin,
      goRegister,
    }),
    [
      phase,
      pending,
      active,
      balanceCents,
      starting,
      errorCode,
      requestCall,
      confirmStart,
      topup,
      endCall,
      dismiss,
      goLogin,
      goRegister,
    ],
  );

  return (
    <VideoContext.Provider value={value}>
      {children}
      <VideoOverlay />
    </VideoContext.Provider>
  );
}

export function useVideoCall(): VideoContextValue {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error("useVideoCall debe usarse dentro de <VideoProvider>.");
  return ctx;
}

/**
 * Cuenta atrás derivada de `expiresAt`. Devuelve segundos restantes y llama a
 * `onExpire` una sola vez al llegar a cero. Se apoya en el reloj real, así
 * que sobrevive a que la pestaña quede en segundo plano.
 */
export function useCountdown(expiresAt: string | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) return;
    firedRef.current = false;
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const secs = Math.max(0, Math.round((target - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  return remaining;
}
