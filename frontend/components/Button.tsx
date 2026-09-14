"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export default function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-[11px] text-[15px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-dark disabled:bg-brand-light"
      : "border-[1.5px] border-line bg-white text-slate-700 hover:border-slate-300 disabled:opacity-60";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}