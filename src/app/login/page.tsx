import LoginForm from "./login-form";
import WearsAnchorLogo from "@/components/wears-logo";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-wears-black px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-wears-tan/20 bg-wears-espresso/40 p-8 shadow-xl">
        <div className="flex justify-center">
          <WearsAnchorLogo variant="full" className="h-24 w-24" />
        </div>
        <p className="mt-3 text-center text-xs tracking-[0.4em] uppercase text-wears-gold">
          Inventario
        </p>
        <p className="mt-1 text-center text-[10px] tracking-[0.3em] uppercase text-wears-tan/70">
          Cueroswears.com
        </p>
        <p className="mt-3 mb-6 text-center text-sm text-wears-sand/60">
          Acceso para administración y aliados comerciales
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
