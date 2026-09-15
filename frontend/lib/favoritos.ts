"use client";

// Estado compartido de favoritos: ids de productos guardados + toggle optimista.
// Carga la lista solo si hay sesión; en invitado se usa (Feed) y el corazón
// redirige a /login.

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export function useFavoritos() {
  const { accessToken, cargando } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [cargandoIds, setCargandoIds] = useState(false);

  useEffect(() => {
    if (!accessToken || cargando) return;
    let activo = true;
    setCargandoIds(true);
    api
      .get<{ ids: string[] }>("/favoritos/ids")
      .then((data) => {
        if (activo) setIds(data.ids);
      })
      .catch(() => {
        if (activo) setIds([]);
      })
      .finally(() => {
        if (activo) setCargandoIds(false);
      });
    return () => {
      activo = false;
    };
  }, [accessToken, cargando]);

  const esFavorito = useCallback((productoId: string) => ids.includes(productoId), [ids]);

  const toggle = useCallback(
    async (productoId: string) => {
      const era = ids.includes(productoId);
      setIds((prev) => (era ? prev.filter((x) => x !== productoId) : [productoId, ...prev]));
      try {
        if (era) {
          await api.del(`/favoritos/${productoId}`);
        } else {
          await api.post("/favoritos", { productoId });
        }
      } catch {
        setIds((prev) => (era ? [productoId, ...prev] : prev.filter((x) => x !== productoId)));
      }
    },
    [ids]
  );

  return { ids, cargandoIds, esFavorito, toggle };
}