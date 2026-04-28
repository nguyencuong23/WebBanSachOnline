"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  end?: boolean;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
};

export function NavLinkNext({ href, end, className = "", activeClassName = "active", children }: Props) {
  const pathname = usePathname();
  const isActive = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={isActive ? `${className} ${activeClassName}`.trim() : className}>
      {children}
    </Link>
  );
}
