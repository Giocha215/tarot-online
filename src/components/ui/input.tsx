"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-line bg-surface/70 px-4 py-2 text-[0.95rem] text-ink",
        "placeholder:text-ink-soft/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent1/50 focus-visible:border-accent1",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus-visible:ring-red-500/40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
