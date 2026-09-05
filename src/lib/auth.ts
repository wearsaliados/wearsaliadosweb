import "server-only";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSession, type SessionPayload } from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateTempPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4).toUpperCase();
}

/** Debe usarse al inicio de cada page.tsx / server action del panel admin. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}

/** Debe usarse al inicio de cada page.tsx / server action del panel de aliados. */
export async function requireAlly(): Promise<SessionPayload & { allyId: string }> {
  const session = await getSession();
  if (!session || session.role !== "ALLY" || !session.allyId) {
    redirect("/login");
  }
  return session as SessionPayload & { allyId: string };
}

export async function requireAnySession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
