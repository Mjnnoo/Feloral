import Link from "next/link";
import { ReactNode } from "react";
import { clsx } from "clsx";

type Props = {
  children: ReactNode;
  href?: string;
  variant?: "gold" | "dark" | "light";
  className?: string;
};

export function LuxuryButton({
  children,
  href,
  variant = "gold",
  className
}: Props) {
  const classes = clsx(
    "inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-300",
    "focus:outline-none focus:ring-2 focus:ring-gold/40",
    {
      "bg-gold text-black hover:-translate-y-0.5 hover:shadow-luxury": variant === "gold",
      "bg-ink text-white hover:-translate-y-0.5 hover:bg-black": variant === "dark",
      "bg-white/90 text-ink ring-1 ring-black/10 hover:bg-white": variant === "light"
    },
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <button className={classes}>{children}</button>;
}
