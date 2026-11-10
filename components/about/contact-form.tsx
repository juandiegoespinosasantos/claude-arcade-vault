"use client";

import { useRef, useState, type FormEvent } from "react";
import { submitContact } from "@/app/acerca-de/actions";
import {
  CONTACT_ERROR_MESSAGES,
  CONTACT_LIMITS,
  type ContactResult,
} from "@/lib/contact";

type FormState = { name: string; email: string; message: string };
type ErrorCode = Extract<ContactResult, { ok: false }>["error"];

const EMPTY: FormState = { name: "", email: "", message: "" };

export function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);
  // Ref guard: state updates are async, so a fast double click could slip through.
  const inFlight = useRef(false);

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inFlight.current) return;

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    inFlight.current = true;
    setPending(true);
    setError(null);

    let result: ContactResult;
    try {
      // The honeypot ("website") travels inside the FormData.
      result = await submitContact(new FormData(e.currentTarget));
    } catch {
      result = { ok: false, error: "SEND_FAILED" };
    }

    inFlight.current = false;
    setPending(false);

    if (result.ok) setSent(result.name || form.name.trim());
    else setError(result.error);
  };

  const reset = () => {
    setSent(null);
    setError(null);
    setForm(EMPTY);
  };

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      onSubmit={onSubmit}
    >
      {sent === null ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={form.name}
              onChange={set("name")}
              placeholder="px_kai"
              maxLength={CONTACT_LIMITS.name}
              autoComplete="nickname"
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="jugador@vault.gg"
              maxLength={CONTACT_LIMITS.email}
              autoComplete="email"
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={form.message}
              onChange={set("message")}
              placeholder="Cuéntanos qué tienes en mente…"
              maxLength={CONTACT_LIMITS.message}
              disabled={pending}
            />
          </div>

          {/* Honeypot: invisible to people, bots tend to fill it. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {CONTACT_ERROR_MESSAGES[error]}
            </p>
          )}

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message
              --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success" role="status">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {sent.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={reset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
