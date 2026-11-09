"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";

interface SketchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function SketchButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: SketchButtonProps) {
  const baseStyles =
    "relative inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none";

  const variants = {
    primary:
      "bg-[var(--ink-primary)] text-[var(--bg-primary)] hover:opacity-90 active:scale-[0.98]",
    secondary:
      "bg-transparent text-[var(--ink-primary)] border-2 border-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] active:scale-[0.98]",
    ghost:
      "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] active:scale-[0.98]",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-sm rounded-md gap-1.5",
    md: "px-6 py-2.5 text-sm rounded-lg gap-2",
    lg: "px-8 py-3.5 text-base rounded-xl gap-2.5",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {/* Sketch border overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="8"
          ry="8"
          fill="none"
          stroke={variant === "primary" ? "var(--bg-primary)" : "var(--ink-primary)"}
          strokeWidth="0.5"
          opacity="0.15"
          strokeDasharray="4 2"
        />
      </svg>
      {children}
    </button>
  );
}
