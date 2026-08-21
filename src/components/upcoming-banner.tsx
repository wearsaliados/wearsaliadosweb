import { prisma } from "@/lib/prisma";
import { requestPreorder } from "@/app/aliado/soporte/actions";

export default async function UpcomingBanner() {
  const upcoming = await prisma.collection.findMany({
    where: { upcoming: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-xl border border-wears-gold/40 bg-gradient-to-r from-wears-black to-wears-espresso p-4 text-wears-cream shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.3em] text-wears-gold">
        Próximamente en El Barco Wears
      </p>
      <div className="mt-2 flex flex-wrap gap-4">
        {upcoming.map((c) => (
          <div key={c.id} className="flex min-w-[240px] flex-1 flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{c.name}</p>
              {c.launchNote && (
                <p className="text-xs text-wears-sand/70">{c.launchNote}</p>
              )}
            </div>
            <form action={requestPreorder.bind(null, c.id)}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-full bg-wears-gold px-4 py-1.5 text-xs font-medium text-wears-black transition hover:bg-wears-tan"
              >
                Pídelos con antelación
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
