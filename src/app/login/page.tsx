import LoginForm from "./login-form";
import WearsAnchorLogo from "@/components/wears-logo";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-wears-black px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-wears-tan/20 bg-wears-espresso/40 p-8 shadow-xl">
        <WearsAnchorLogo className="mx-auto h-14 w-14 text-wears-cream" />
        <p className="mt-3 text-center text-xs tracking-[0.4em] uppercase text-wears-tan">
          Cueroswears.com
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-wears-cream">
          Wears Inventario
        </h1>
        <p className="mt-1 mb-6 text-center text-sm text-wears-sand/60">
          Acceso para administración y aliados comerciales
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
