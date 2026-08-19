import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavLink from "@/components/nav-link";
import LogoutButton from "@/components/logout-button";
import MustChangePasswordBanner from "@/components/must-change-password-banner";

const links = [
  { href: "/admin", label: "Panel general" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/aliados", label: "Aliados comerciales" },
  { href: "/admin/ventas", label: "Ventas" },
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
        <aside className="lg:w-64 shrink-0 bg-wears-black text-wears-cream">
          <div className="p-6">
            <p className="text-[10px] tracking-[0.4em] uppercase text-wears-tan">
              Cueroswears.com
            </p>
            <p className="mt-1 text-lg font-semibold">Wears Inventario</p>
            <p className="mt-0.5 text-xs text-wears-sand/50">Panel administrador</p>
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
        </aside>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
