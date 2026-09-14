"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, bindToken } from "./api";

export type Usuario = {
  id: string;
  nombre: string;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  reparto?: string | null;
  rol: string;
};

export type DatosRegistro = {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
  telefono?: string;
  reparto?: string;
};

type AuthState = {
  accessToken: string | null;
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  registrar: (datos: DatosRegistro) => Promise<void>;
  loginGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUsuario: (u: Usuario | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    bindToken({ accessToken, setAccessToken });
  }, [accessToken]);

  // Restaura la sesión al cargar la app: el accessToken no persiste (memoria),
  // pero la cookie httpOnly del refresh sí (30 días). POST /auth/refresh la
  // intercambia por un accessToken nuevo en cada arranque.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const data = await api.post<{ accessToken?: string; user?: Usuario }>("/auth/refresh", {});
        if (!activo) return;
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          if (data.user) setUsuario(data.user);
        }
      } catch {
        /* sin sesión activa -> invitado */
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const aplicarSesion = useCallback((data: { accessToken: string; user?: Usuario }) => {
    setAccessToken(data.accessToken);
    if (data.user) setUsuario(data.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<{ accessToken: string; user?: Usuario }>("/auth/login", {
        cuenta: email,
        password,
      });
      aplicarSesion(data);
    },
    [aplicarSesion],
  );

  const registrar = useCallback(
    async (datos: DatosRegistro) => {
      const data = await api.post<{ accessToken: string; user?: Usuario }>("/auth/register", datos);
      aplicarSesion(data);
    },
    [aplicarSesion],
  );

  const loginGoogle = useCallback(
    async (idToken: string) => {
      const data = await api.post<{ accessToken: string; user?: Usuario }>("/auth/google", {
        idToken,
      });
      aplicarSesion(data);
    },
    [aplicarSesion],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      /* ignorar */
    }
    setAccessToken(null);
    setUsuario(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ accessToken, usuario, cargando, login, registrar, loginGoogle, logout, setUsuario }),
    [accessToken, usuario, cargando, login, registrar, loginGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}