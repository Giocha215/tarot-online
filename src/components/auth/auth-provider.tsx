"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "@/lib/auth/api-client";
import type { User } from "@/lib/auth/types";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: Status;
  isAuthenticated: boolean;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<User>;
  login: (input: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Renueva el access token un poco antes de que caduque (TTL 15m). */
const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Al montar: intenta rehidratar la sesión desde la cookie httpOnly.
  useEffect(() => {
    let cancelled = false;

    api
      .refreshSession()
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setUser(result.user);
          setStatus("authenticated");
        } else {
          setUser(null);
          setStatus("anonymous");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Renovación periódica mientras haya sesión.
  useEffect(() => {
    if (status !== "authenticated") return;

    const id = setInterval(() => {
      api.refreshSession().then((result) => {
        if (result) {
          setUser(result.user);
        } else {
          setUser(null);
          setStatus("anonymous");
        }
      });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(id);
  }, [status]);

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      const { user: created } = await api.register(input);
      setUser(created);
      setStatus("authenticated");
      return created;
    },
    [],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const { user: logged } = await api.login(input);
      setUser(logged);
      setStatus("authenticated");
      return logged;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const reload = useCallback(async () => {
    try {
      setUser(await api.fetchMe());
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      register,
      login,
      logout,
      reload,
    }),
    [user, status, register, login, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  }
  return ctx;
}
