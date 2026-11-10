# SPEC 03 — About page and contact email

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-09
> **Objective:** Add the About page with its contact form at `/acerca-de`, ported from `references/templates/home-about/about.jsx`, where submitting the form sends an email to the team through Resend from a Next.js Server Action.

---

## Why this spec exists

SPEC 02 ported the home page and explicitly left the About page, the contact form and the navbar link out of scope. The template `references/templates/home-about/about.jsx` (and the `/* ===== ABOUT PAGE ===== */` block of its `styles.css`) is the visual source of truth. The template's form only fakes the submission (`setSent(...)`); this spec makes it real. It is the first feature that needs server-side secrets, so the configuration and abuse-protection decisions are recorded here.

---

## Scope

**In:**

- New page at `/acerca-de` with the template's sections, wording identical to `about.jsx`:
  1. About hero: kicker "▸ ACERCA DE", title "ACERCA DE ARCADE VAULT", mission paragraph, and three highlights (HECHO CON ❤️ PARA JUGADORES, JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR, PROYECTO EN CONSTANTE CRECIMIENTO) with pixel SVG icons.
  2. Animated pixel divider (24 pixels, `aria-hidden`).
  3. Contact: kicker "▸ CONTACTO", title "CONTÁCTANOS", subtitle, three tips (RESPUESTA EN 24-48H, SUGERENCIAS BIENVENIDAS, SIN SPAM, JAMÁS), and the form (NOMBRE, CORREO ELECTRÓNICO, MENSAJE, "▶  ENVIAR MENSAJE").
- Real email sending with Resend (`resend` npm package) from a Server Action in `app/acerca-de/actions.ts`:
  - One email to `CONTACT_TO_EMAIL`, sent from `CONTACT_FROM_EMAIL`, with `replyTo` set to the visitor's address.
  - Subject `[ARCADE VAULT] Mensaje de <name>`; plain-text body with name, email and message.
- Server-side validation (never trusting the client): required fields, email format, max lengths, trimmed values.
- Abuse protection without external services: hidden honeypot field and an in-memory rate limit per IP.
- Form states: idle, sending (button disabled, label "ENVIANDO…"), success (the template's terminal view with the visitor's name uppercased), error (inline message, fields preserved), and the template's `shake` on empty fields.
- Scroll-reveal on the divider and contact section, reusing `components/home/reveal.tsx` from SPEC 02.
- Navbar: add "Acerca de" (→ `/acerca-de`) after "Salón de la Fama" in the desktop links and the mobile panel, with the active underline.
- Port the `/* ===== ABOUT PAGE ===== */` CSS block (and keyframes it uses) into `app/globals.css`.
- `.env.example` with the three variables; the real `.env.local` stays untracked.

**Out of scope (for future specs):**

- Confirmation / auto-reply email to the visitor.
- CAPTCHA (Turnstile, reCAPTCHA) or any third-party anti-bot script.
- Persisting messages (database, `localStorage`) or an admin inbox.
- Persistent or distributed rate limiting (Redis, Upstash). The in-memory limit is per server instance.
- "Acerca de" link in the footer.
- Attachments, rich-text/HTML email templates, i18n, tests, SEO beyond page metadata.
- Any change to other screens beyond the navbar link.

---

## Data model

No persistent data and no `localStorage` keys. New server-side configuration and types:

```ts
// Environment variables (server only, never NEXT_PUBLIC_*)
// RESEND_API_KEY       -> Resend API key
// CONTACT_TO_EMAIL     -> team inbox that receives the messages
// CONTACT_FROM_EMAIL   -> verified sender, e.g. "Arcade Vault <contacto@dominio.com>"
//                         (for testing: "Arcade Vault <onboarding@resend.dev>")
```

```ts
// lib/contact.ts — shared by the form (client) and the action (server)
export const CONTACT_LIMITS = { name: 60, email: 120, message: 2000 } as const;

export interface ContactInput { name: string; email: string; message: string }

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: "VALIDATION" | "RATE_LIMIT" | "SEND_FAILED" };

export function validateContact(raw: Record<string, unknown>): ContactInput | null;
```

Conventions:

- The form field names are `name`, `email`, `message` and the honeypot `website` (hidden off-screen, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`).
- A filled honeypot returns `{ ok: true }` without sending anything, so bots get no signal.
- Rate limit: max 3 messages per IP per 10 minutes, stored in a module-level `Map` in `lib/rate-limit.ts`; the IP comes from the `x-forwarded-for` header (first value), falling back to `"unknown"`.
- Error messages shown to the user (Spanish, generic, no internal details): `VALIDATION` → "REVISA LOS CAMPOS E INTÉNTALO DE NUEVO."; `RATE_LIMIT` → "DEMASIADOS MENSAJES. ESPERA UNOS MINUTOS."; `SEND_FAILED` → "NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO."
- If any env variable is missing or Resend returns an error, the action logs the cause with `console.error` on the server and returns `SEND_FAILED`.
- Email body is plain text; user input is never interpolated into HTML.

---

## Implementation plan

Before step 1, read the relevant guides in `node_modules/next/dist/docs/` (per `AGENTS.md`): especially Server Actions / `"use server"`, `useActionState` or form submission from client components, `headers()` (async in Next 16), and metadata. Use the `/frontend-design` skill for the UI work (per `CLAUDE.md`). Check the current Resend Node SDK usage before writing the send call.

1. **About CSS.** Port the `/* ===== ABOUT PAGE ===== */` block from the template `styles.css` into `app/globals.css`, plus any missing keyframes or variables it references (e.g. `shake`, caret blink). Manual check: `npm run build` passes; no visual change on existing routes.
2. **Contact data layer.** Create `lib/contact.ts` (limits, types, `validateContact`) and `lib/rate-limit.ts` (in-memory limiter). Manual check: `npx tsc --noEmit` passes.
3. **Email sending.** Install `resend`. Create `app/acerca-de/actions.ts` (`"use server"`; reads honeypot, validates, rate-limits, sends, returns `ContactResult`). Add `.env.example` and make sure `.gitignore` keeps `.env.local` ignored but tracks `.env.example`. Manual check: with a real key in `.env.local`, calling the action from a temporary script or the form in step 5 delivers an email; without the key it returns `SEND_FAILED`.
4. **About components.** Create `components/about/highlight-icon.tsx` (server, HEART / BROWSER / PLANT SVGs) and `components/about/contact-form.tsx` (client: controlled fields, honeypot, sending/success/error states, shake, terminal success view with "ENVIAR OTRO MENSAJE"). Manual check: components compile.
5. **About page.** Create `app/acerca-de/page.tsx` (server component, with `metadata` title "Acerca de | Arcade Vault"), with hero, highlights, divider and contact section; `Reveal` around the divider and contact. Manual check: the page renders at `/acerca-de`, submitting a valid form shows the terminal success view and the email arrives with the visitor as Reply-To.
6. **Navbar "Acerca de".** Add the link to the desktop links and the mobile panel in `components/nav.tsx`, active when pathname is `/acerca-de`. Manual check: underline appears only on `/acerca-de`; the mobile panel closes after navigating.
7. **Polish pass.** Check responsive behavior (375 / 768 / 1280 px), remove leftovers, run `npm run lint` and `npm run build`. Manual check: both pass with no errors.

---

## Acceptance criteria

- [ ] `npm run lint` and `npm run build` finish without errors.
- [ ] `/acerca-de` shows the hero, three highlights, divider and contact section in order, with the exact Spanish wording of `about.jsx`.
- [ ] The navbar shows "Inicio", "Biblioteca", "Salón de la Fama", "Acerca de" on desktop and in the mobile panel; "Acerca de" is underlined only on `/acerca-de`.
- [ ] Submitting the form with an empty name, email or message does not call the server and applies the `shake` class for 400 ms.
- [ ] Submitting a valid form sends exactly one email to `CONTACT_TO_EMAIL` from `CONTACT_FROM_EMAIL`, with `Reply-To` equal to the visitor's email and the subject `[ARCADE VAULT] Mensaje de <name>`.
- [ ] After a successful send, the terminal view shows "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE EN MAYÚSCULAS>."; "ENVIAR OTRO MENSAJE" returns to an empty form.
- [ ] While sending, the submit button is disabled and reads "ENVIANDO…"; double clicking sends only one email.
- [ ] With `RESEND_API_KEY` removed, submitting shows "NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.", keeps the typed values, and re-enables the button; the cause is logged on the server and never shown in the browser.
- [ ] The server rejects (without sending) a name over 60 chars, a message over 2000 chars, an invalid email format, or empty fields, even when the client validation is bypassed.
- [ ] A submission with the honeypot field filled shows the success view but no email is sent.
- [ ] The fourth valid submission from the same IP within 10 minutes shows "DEMASIADOS MENSAJES. ESPERA UNOS MINUTOS." and sends no email.
- [ ] `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL` do not appear in the client bundle or in any tracked file; `.env.example` is tracked with placeholder values only.
- [ ] The divider and contact section start hidden and become visible on scroll; with `prefers-reduced-motion: reduce` they are visible without scrolling.
- [ ] At 375 px the page has no horizontal scroll and the contact grid is a single column.
- [ ] No hydration warnings or console errors on `/acerca-de`, with and without `av_user` in `localStorage`.

---

## Decisions

- **Yes:** Resend for delivery. Simple HTTP API, free tier, no SMTP setup, good fit for one transactional email.
- **No:** Nodemailer + SMTP. More env vars and deliverability handled by us. **No:** Formspree or similar, because the goal is to implement the sending ourselves.
- **Yes:** Server Action in `app/acerca-de/actions.ts`. No extra endpoint, idiomatic in Next 16, secrets stay server-side.
- **No:** Route Handler `/api/contacto`. Useful only if another client needs the endpoint; can be added later.
- **Yes:** One email to the team with `Reply-To` set to the visitor. Team can answer directly from the inbox.
- **No:** Confirmation email to the visitor. Doubles sends and makes the form usable to spam third parties.
- **Yes:** Server-side re-validation plus honeypot and in-memory rate limit. Cheap, no third-party script, enough for a low-traffic form.
- **No:** CAPTCHA. Adds keys, a script and UI; revisit if spam actually appears.
- **No:** Persistent rate limiting. The in-memory limit resets on restart and is per instance; acceptable for this stage.
- **Yes:** Inline error with preserved fields. The visitor never loses a long message because of a transient failure.
- **Yes:** Generic user-facing errors, details only in server logs. Avoids leaking configuration.
- **Yes:** Fail with `SEND_FAILED` when env vars are missing, with no dev console fallback. A fake success would hide misconfiguration.
- **Yes:** "Acerca de" only in the navbar, as SPEC 02 did for "Inicio". Footer link is deferred.
- **Yes:** Reuse template CSS classes in `globals.css` and `Reveal` from SPEC 02 instead of rewriting in Tailwind (same decision as SPEC 01 and SPEC 02).
- **Yes:** Page is a server component; only the contact form is client-side.

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Resend rejects the sender if the domain is not verified | Document `onboarding@resend.dev` as the testing sender in `.env.example`; production needs a verified domain. |
| In-memory rate limit is bypassed across serverless instances or restarts | Accepted for this stage (see Decisions); upgrade to a shared store in a later spec if abuse appears. |
| `x-forwarded-for` can be spoofed or absent | Use only the first value, fall back to `"unknown"`; the limit is a deterrent, not a security boundary. |
| Header injection or HTML injection through name/email/message | Validate email format and reject newlines in name and email; subject built from the trimmed name; body is plain text. |
| Secrets leaking to the client or git | Variables without `NEXT_PUBLIC_` prefix, used only in the action; `.env.local` ignored, `.env.example` has placeholders. |
| Template CSS references keyframes or variables missing from `globals.css` | Step 1 checks each referenced keyframe and variable and ports what is missing. |
| Next.js 16 changes to Server Actions or `headers()` vs. what the code is usually written against | Read `node_modules/next/dist/docs/` before step 1, as `AGENTS.md` requires. |

---

## What is **not** in this spec

- Confirmation emails to the visitor.
- CAPTCHA or other third-party anti-bot services.
- Storing messages or an admin inbox.
- Distributed rate limiting.
- Footer link to "Acerca de".
- Tests, SEO work, i18n, or visual redesign.

Each one of those, if it lands, goes in its own spec.
