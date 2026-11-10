"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { validateContact, type ContactResult } from "@/lib/contact";
import { rateLimit } from "@/lib/rate-limit";

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Sends the contact form to the team inbox via Resend.
 * Order: honeypot -> validation -> rate limit -> send.
 */
export async function submitContact(formData: FormData): Promise<ContactResult> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  };

  // Honeypot: bots fill the hidden field. Fake success, send nothing.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { ok: true, name: typeof raw.name === "string" ? raw.name.trim() : "" };
  }

  const input = validateContact(raw);
  if (!input) return { ok: false, error: "VALIDATION" };

  if (!rateLimit(await clientIp())) return { ok: false, error: "RATE_LIMIT" };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error(
      "[contact] Missing env vars: RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL are required.",
    );
    return { ok: false, error: "SEND_FAILED" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: input.email,
      subject: `[ARCADE VAULT] Mensaje de ${input.name}`,
      text: `Nombre: ${input.name}\nCorreo: ${input.email}\n\nMensaje:\n${input.message}\n`,
    });
    if (error) {
      console.error("[contact] Resend error:", error);
      return { ok: false, error: "SEND_FAILED" };
    }
  } catch (err) {
    console.error("[contact] Unexpected send failure:", err);
    return { ok: false, error: "SEND_FAILED" };
  }

  return { ok: true, name: input.name };
}
