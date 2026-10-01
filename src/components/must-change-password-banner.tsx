import Link from "next/link";

export default function MustChangePasswordBanner() {
  return (
    <div className="bg-amber-500/90 px-4 py-2 text-center text-sm text-wears-black">
      Estás usando una contraseña temporal.{" "}
      <Link href="/cambiar-password" className="font-semibold underline">
        Cámbiala ahora
      </Link>
      .
    </div>
  );
}
