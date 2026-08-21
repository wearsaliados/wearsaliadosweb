import Image from "next/image";
import LoginForm from "./login-form";
import WearsAnchorLogo from "@/components/wears-logo";

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-wears-black px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/barco-wears.jpg"
          alt=""
          fill
          className="object-cover opacity-15"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-wears-black/80" />
      </div>
      <div className="relative w-full max-w-sm rounded-2xl border border-wears-tan/20 bg-wears-espresso/40 p-8 shadow-xl backdrop-blur-sm">
        <div className="flex justify-center">
          <WearsAnchorLogo variant="full" className="h-24 w-24" />
        </div>
        <p className="mt-3 text-center text-xs tracking-[0.4em] uppercase text-wears-gold">
          Inventario
        </p>
        <p className="mt-1 text-center text-[10px] tracking-[0.3em] uppercase text-wears-tan/70">
          aliadoswears.com
        </p>
        <p className="mt-3 mb-6 text-center text-sm text-wears-sand/60">
          Acceso para administración y aliados comerciales
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
