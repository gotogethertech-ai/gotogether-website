import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type CommonProps = {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses: Record<NonNullable<CommonProps["size"]>, string> = {
  sm: "px-4 py-2 text-[12.5px]",
  md: "px-[22px] py-[13px] text-[14.5px]",
  lg: "px-8 py-[15px] text-[15.5px]",
};

/**
 * Primary accent CTA (orange) — "Create Trip". Per Navigation System Step 8:
 * exactly one accent-colored button in the header at any time.
 */
export function AccentButton({
  children,
  size = "md",
  className = "",
  href,
  ...rest
}: CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: string }) {
  const classes = `inline-flex items-center justify-center gap-1.5 rounded-full bg-accent font-semibold text-white whitespace-nowrap transition-opacity hover:opacity-90 font-sans ${sizeClasses[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

/** Solid primary-blue button — used inside the Auth modal ("Send Code"). */
export function PrimaryButton({
  children,
  className = "",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-white font-sans transition-opacity hover:opacity-90 disabled:bg-[oklch(88%_0.01_255)] disabled:text-[oklch(60%_0.01_255)] disabled:cursor-default ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Text nav-style link, per .navlink in the design docs. */
export function NavLink({
  children,
  href,
  className = "",
  active = false,
}: {
  children: ReactNode;
  href: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium text-text-secondary hover:text-primary transition-colors font-sans ${
        active ? "text-primary font-semibold" : ""
      } ${className}`}
    >
      {children}
    </Link>
  );
}
