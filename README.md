# Morrow — AI Mock Interview Bot

Project #11 for the GenAI track: a role-based AI interviewer that asks one question at a time, evaluates each response, and creates a scored report that can also be emailed.

## Assignment checklist

- [x] **Role selection** — choose Software Developer, Data Analyst, AI/ML Engineer, or Web Developer before starting.
- [x] **AI asks questions one by one** — a Gemini server route creates five role-specific questions in sequence.
- [x] **AI evaluates each answer** — each submitted answer receives a 1–10 score, feedback, strengths, and improvement ideas.
- [x] **Final score and feedback report (also emailed)** — the report combines all five evaluations, displays next steps, and emails a copy when Resend is configured.

The landing page asks candidates to confirm that their answers will be analyzed, emailed, and saved when Supabase is enabled.

Before the interview, candidates also consent to fullscreen and local camera face-count checks. Face detection runs locally in the browser; camera video is never recorded or sent to the server. Leaving the interview window, reloading, a sustained missing face, or disconnecting the camera ends the session. Exiting fullscreen or a sustained multiple-face event triggers a warning; the third warning ends the interview. Candidates must return to fullscreen or restore a single visible face before dismissing the warning. This is an integrity signal, not a way to identify which external app a candidate opens.

## Stack

- Next.js 14 App Router, TypeScript, and Tailwind CSS
- Google Gemini API with `gemini-3.1-flash-lite`
- Murf text-to-speech through a Next.js API route
- Browser Web Speech API for microphone input, with a typed-answer fallback
- Supabase for optional interview history
- Resend for optional email delivery

All third-party requests run in Next.js API routes. API credentials are read from server environment variables and are never included in client bundles.

Google currently lists Gemini 3.8 Flash-Lite as a speech synthesis model. This app uses `gemini-3.1-flash-lite`, its general-purpose lightweight model, for interviewer questions, evaluations, and report summaries; Murf handles speech output.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` for the second command. Add provider credentials to `.env.local` before using the matching integration.

| Variable | Used for |
| --- | --- |
| `GEMINI_API_KEY` | Question generation, answer evaluation, and report summary |
| `MURF_API_KEY` | Spoken interviewer questions |
| `RESEND_API_KEY` | Sending the final report by email |
| `RESEND_FROM_EMAIL` | Verified Resend sender address |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (server-side use in this app) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (server-side use in this app) |

The app works without Murf or Supabase. If Resend is not configured, the final report remains available on screen. Gemini is required for generating and evaluating questions.

The footer lists the project contact email (`arjunsingha.tech@gmail.com`), phone (`8264627200`), and copyright notice.

## Supabase setup

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. The table stores the candidate's name and email, selected role, score, feedback, and transcript. Row-level security is enabled, with insert access for the anon role so the server route can save completed reports. Tighten the policy or add authentication before using this schema for a public production service.

## API routes

| Route | Purpose |
| --- | --- |
| `POST /api/question` | Generate the next role-specific question with Gemini |
| `POST /api/evaluate` | Score one answer and return feedback with Gemini |
| `POST /api/voice` | Generate interviewer speech with Murf |
| `POST /api/report` | Build the final report, optionally store it in Supabase, and email it through Resend |

## Security notes

- `.env.local` and other `.env*` files are ignored by Git; `.env.example` contains empty values only.
- Provider secrets are only referenced from server routes.
- API routes validate role, email, turn count, and text sizes.
- Email report content is HTML-escaped before sending.
- Microphone input uses the browser's built-in Web Speech API; typed answers are always available as a fallback.

