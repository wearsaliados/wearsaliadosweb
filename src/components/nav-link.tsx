"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/admin" || href === "/aliado"
    ? pathname === href
    : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-wears-gold text-wears-black font-medium"
          : "text-wears-sand/80 hover:bg-wears-black/30 hover:text-wears-cream"
      }`}
    >
      {children}
    </Link>
  );
}
