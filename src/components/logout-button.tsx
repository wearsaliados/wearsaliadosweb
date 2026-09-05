import { logout } from "./logout-action";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-full border border-wears-tan/40 px-4 py-1.5 text-sm text-wears-sand transition hover:border-wears-gold hover:text-wears-gold"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
