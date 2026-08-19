import { prisma } from "@/lib/prisma";

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
          <div key={c.id} className="min-w-[200px] flex-1">
            <p className="font-medium">{c.name}</p>
            {c.launchNote && (
              <p className="text-xs text-wears-sand/70">{c.launchNote}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
