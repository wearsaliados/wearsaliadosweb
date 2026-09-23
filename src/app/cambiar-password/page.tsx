import { requireAnySession } from "@/lib/auth";
import ChangePasswordForm from "./change-password-form";

export default async function CambiarPasswordPage() {
  await requireAnySession();

  return (
    <main className="flex flex-1 items-center justify-center bg-wears-cream px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-wears-tan/30 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-wears-black">
          Cambia tu contraseña
        </h1>
        <p className="mt-1 mb-6 text-sm text-wears-espresso/60">
          Por seguridad, actualiza tu contraseña temporal.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
