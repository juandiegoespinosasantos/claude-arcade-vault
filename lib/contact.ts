// Shared by the contact form (client) and the Server Action (server).

export const CONTACT_LIMITS = { name: 60, email: 120, message: 2000 } as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: "VALIDATION" | "RATE_LIMIT" | "SEND_FAILED" };

export const CONTACT_ERROR_MESSAGES: Record<
  Extract<ContactResult, { ok: false }>["error"],
  string
> = {
  VALIDATION: "REVISA LOS CAMPOS E INTÉNTALO DE NUEVO.",
  RATE_LIMIT: "DEMASIADOS MENSAJES. ESPERA UNOS MINUTOS.",
  SEND_FAILED: "NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEWLINE_RE = /[\r\n]/;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Returns the cleaned input, or null when any field is invalid. */
export function validateContact(raw: Record<string, unknown>): ContactInput | null {
  const name = asTrimmedString(raw.name);
  const email = asTrimmedString(raw.email);
  const message = asTrimmedString(raw.message);

  if (!name || !email || !message) return null;
  if (name.length > CONTACT_LIMITS.name) return null;
  if (email.length > CONTACT_LIMITS.email) return null;
  if (message.length > CONTACT_LIMITS.message) return null;
  // Header-injection guard: these two end up in the subject / Reply-To.
  if (NEWLINE_RE.test(name) || NEWLINE_RE.test(email)) return null;
  if (!EMAIL_RE.test(email)) return null;

  return { name, email, message };
}
