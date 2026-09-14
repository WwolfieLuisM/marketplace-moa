import type { CSSProperties } from "react";

type Props = {
  nombre?: string | null;
  apellidos?: string | null;
  className?: string;
  style?: CSSProperties;
};

function iniciales(nombre?: string | null, apellidos?: string | null) {
  const n = (nombre || "").trim().charAt(0);
  const a = (apellidos || "").trim().charAt(0);
  return (n + a).toUpperCase() || "?";
}

export default function Avatar({ nombre, apellidos, className = "", style }: Props) {
  return (
    <span
      aria-hidden
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avatar text-[15px] font-bold text-brand ${className}`}
      style={style}
    >
      {iniciales(nombre, apellidos)}
    </span>
  );
}