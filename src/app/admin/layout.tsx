import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavLink from "@/components/nav-link";
import LogoutButton from "@/components/logout-button";
import MustChangePasswordBanner from "@/components/must-change-password-banner";
import WearsAnchorLogo from "@/components/wears-logo";

const links = [
  { href: "/admin", label: "Panel general" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/aliados", label: "Aliados comerciales" },
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/movimientos", label: "Movimientos" },
  { href: "/admin/reposicion", label: "Reposición" },
  { href: "/admin/soporte", label: "Soporte" },
  { href: "/admin/configuracion", label: "Notificaciones" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  return (
    <div className="flex flex-1 flex-col">
      {user?.mustChangePw && <MustChangePasswordBanner />}
      <div className="flex flex-1 flex-col lg:flex-row bg-wears-cream">
        <aside className="relative lg:w-64 shrink-0 overflow-hidden bg-wears-black text-wears-cream">
          <div className="pointer-events-none absolute inset-0">
            <Image
              src="/brand/barco-wears.jpg"
              alt=""
              fill
              className="object-cover opacity-[0.07]"
              sizes="256px"
            />
            <div className="absolute inset-0 bg-wears-black/92" />
          </div>
          <div className="relative">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wears-black ring-1 ring-wears-gold/40">
                  <WearsAnchorLogo className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-wears-tan">
                    aliadoswears.com
                  </p>
                  <p className="text-lg font-semibold leading-tight">Wears Inventario</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-wears-sand/50">Panel administrador</p>
            </div>
            <nav className="flex flex-row flex-wrap gap-1 px-4 pb-4 lg:flex-col">
              {links.map((l) => (
                <NavLink key={l.href} href={l.href}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 border-t border-wears-tan/10 p-4">
              <p className="mb-2 text-xs text-wears-sand/60">{session.name}</p>
              <LogoutButton />
            </div>
          </div>
        </aside>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
