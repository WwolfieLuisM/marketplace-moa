export function inicioDeDia(fecha: Date) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function claveDia(iso: string, hoyInicio: number, ayerInicio: number): string {
  const t = inicioDeDia(new Date(iso));
  if (t === hoyInicio) return "Hoy";
  if (t === ayerInicio) return "Ayer";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}

export function formatearLista(iso: string, hoyInicio: number, ayerInicio: number): string {
  const t = inicioDeDia(new Date(iso));
  if (t === hoyInicio) return formatearHora(iso);
  if (t === ayerInicio) return "Ayer " + formatearHora(iso);
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" }) +
    " " + formatearHora(iso);
}