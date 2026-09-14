"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  icon?: ReactNode;
};

export default function Input({ label, icon, className = "", id, ...props }: Props) {
  return (
    <div className="mb-[18px]">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-slate-400">
            <span className="block h-[18px] w-[18px] [&>svg]:h-full [&>svg]:w-full">{icon}</span>
          </span>
        )}
        <input
          id={id}
          className={`w-full rounded-[10px] border-[1.5px] border-line bg-white px-[14px] py-3 text-[15px] text-ink outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand ${
            icon ? "pl-[42px]" : ""
          } ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}