"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

const schema = z.object({
  email: z.string().trim().min(3, "Ingresa tu correo o usuario"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginState = { error?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { ally: true },
  });

  if (!user || !user.active) {
    return { error: "Correo o contraseña incorrectos" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Correo o contraseña incorrectos" };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    allyId: user.ally?.id ?? null,
    name: user.name,
  });

  redirect(user.role === "ADMIN" ? "/admin" : "/aliado");
}
