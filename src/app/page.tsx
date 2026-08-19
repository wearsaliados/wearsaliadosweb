import Link from "next/link";
import WearsAnchorLogo from "@/components/wears-logo";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center bg-wears-black text-wears-cream">
      <WearsAnchorLogo variant="full" className="h-32 w-32" />
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-wears-tan">
          Cueroswears.com
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight">
          Wears <span className="text-wears-gold">Inventario</span>
        </h1>
      </div>
      <p className="max-w-md text-wears-sand/80">
        Plataforma interna de control de inventarios, ventas y consignación
        para la tienda en línea, puntos físicos, fábrica y aliados
        comerciales de El Barco Wears.
      </p>
      <Link
        href="/login"
        className="rounded-full bg-wears-gold px-8 py-3 font-medium text-wears-black transition hover:bg-wears-tan"
      >
        Ingresar
      </Link>
    </main>
  );
}
