import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

type NotifyInput = {
  event: string;
  subject: string;
  message: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail(input: NotifyInput) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const client = getTransporter();

  if (!to || !client) {
    await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        event: input.event,
        recipient: to ?? "(no configurado)",
        message: input.message,
        status: "SKIPPED",
        error: !to
          ? "ADMIN_NOTIFICATION_EMAIL no configurado"
          : "SMTP no configurado (SMTP_HOST/PORT/USER/PASS)",
      },
    });
    return;
  }

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: input.subject,
      text: input.message,
    });
    await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        event: input.event,
        recipient: to,
        message: input.message,
        status: "SENT",
      },
    });
  } catch (err) {
    await prisma.notificationLog.create({
      data: {
        channel: "EMAIL",
        event: input.event,
        recipient: to,
        message: input.message,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

async function sendWhatsApp(input: NotifyInput) {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TO } = process.env;

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID || !WHATSAPP_TO) {
    await prisma.notificationLog.create({
      data: {
        channel: "WHATSAPP",
        event: input.event,
        recipient: WHATSAPP_TO ?? "(no configurado)",
        message: input.message,
        status: "SKIPPED",
        error: "WhatsApp Cloud API no configurado (WHATSAPP_TOKEN/PHONE_ID/TO)",
      },
    });
    return;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: WHATSAPP_TO,
          type: "text",
          text: { body: `${input.subject}\n\n${input.message}` },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`WhatsApp API respondio ${res.status}: ${await res.text()}`);
    }

    await prisma.notificationLog.create({
      data: {
        channel: "WHATSAPP",
        event: input.event,
        recipient: WHATSAPP_TO,
        message: input.message,
        status: "SENT",
      },
    });
  } catch (err) {
    await prisma.notificationLog.create({
      data: {
        channel: "WHATSAPP",
        event: input.event,
        recipient: WHATSAPP_TO,
        message: input.message,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

/** Envia (o registra el intento de) notificacion por correo y WhatsApp al administrador. */
export async function notifyAdmin(input: NotifyInput) {
  await Promise.all([sendEmail(input), sendWhatsApp(input)]);
}
