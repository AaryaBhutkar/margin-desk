# Margin

**A little research. A clearer decision.**

Margin is a research desk for decisions that deserve more than an instant AI answer. You frame a question, collect and read sources, record what each one means for your decision, and get an AI-drafted decision brief in which every claim cites a page you saved. The final decision stays yours, recorded in your own words.

**Live app:** <https://margin-desk.app.space>

![A decision brief: a cited recommendation, with the sources it draws on listed alongside](docs/screenshots/decision-brief.png)

## Contents

- [Core features](#core-features)
- [How AI supports the decision](#how-ai-supports-the-decision)
- [Architecture](#architecture)
- [DeepSpace integrations](#deepspace-integrations)
- [Security and trust boundaries](#security-and-trust-boundaries)
- [Design decisions and limits](#design-decisions-and-limits)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)

## Core features

1. **Frame the decision.** A brief starts with a specific question and the constraints that matter, such as team size, budget, or deadline.
2. **Find evidence.** Search the web for candidate sources, or add any public HTTPS page directly.
3. **Capture and read.** Margin saves the main text of each chosen page as a snapshot, so you read the actual source rather than a search snippet.
4. **Annotate.** For each source, record your stance (supports, challenges, or adds context), write a note, and include it in the brief or set it aside.
5. **Draft a decision brief.** The AI drafts a brief from two to six included sources. Every claim cites the sources behind it, and each citation opens the saved text and your note.
6. **Decide.** Record your own decision, separate from the AI draft.
7. **Export.** Download the brief as Markdown, with your decision, the cited draft, the source list with capture dates, and your research notes.

Briefs and evidence sync live across all of a user's open sessions. Signed-out visitors can explore a clearly labeled example desk, which makes no paid calls.

![The evidence view: saved sources with the reader's stance and notes, and a tally of supporting and challenging evidence](docs/screenshots/evidence.png)

## How AI supports the decision

AI in Margin drafts the reasoning, and the reader makes the decision. The model is used at one step, drafting the decision brief, and it works only from evidence the reader has chosen and read.

**What the model receives.** The question and its constraints, plus each included source: its title, URL, capture date, the reader's stance and note, and the first 9,000 characters of its saved text. It has no browsing tools, no write access, and is instructed not to use outside knowledge.

**What it returns.** A structured brief, validated against a Zod schema before it is saved:

| Part | Purpose |
| --- | --- |
| Headline and recommendation | A short conclusion and a qualified recommendation, with citations |
| Findings (2 to 4) | What the evidence says, each claim cited |
| Counterargument | The strongest caveat or alternative, required even when the evidence is one-sided |
| Uncertainties (1 to 4) | What the evidence does not answer |
| Next step | One concrete test to run before committing |

**How the output is kept honest.**

- **Citations are checked on the server.** Any claim that cites a source outside the included set is rejected, along with the whole draft, and the previous draft is kept.
- **Sources are treated as data, not instructions.** The prompt tells the model never to follow instructions found in page text or notes, which guards against prompt injection from captured pages.
- **A stance is an opinion, not proof.** The model is told that the reader's stance is their own reading of a source, and to weigh the strongest counterargument regardless.
- **Thin evidence leads to a cautious draft.** With little evidence, the model is told to recommend a small, reversible next step and to list what remains unknown.
- **Output is consistent.** A low temperature (0.2), a token cap, and a 450-word target in the prompt keep drafts focused and comparable.

**How the reader stays in control.**

- The reader chooses which sources reach the model, and how each one is read.
- The reader's decision is recorded separately from the AI draft, and the export keeps them under separate headings.
- Changing any included source, stance, or note marks the draft out of date, so a brief is never silently based on old evidence.
- A valid citation proves which saved source a claim refers to, not that the model read it correctly. The reader can open the saved text and the original page to check.

## Architecture

```text
Browser (React)
 │
 ├── live records (WebSocket) ──────▶ RecordRoom (SQLite: briefs, evidence)
 │                                     owner-only reads; narrow browser writes
 │
 └── POST /api/actions/:name ───────▶ Worker (Hono)
                                       ├─▶ ResearchBudget (Durable Object): daily limits, per-brief leases
                                       ├─▶ DeepSpace integration proxy ─▶ Exa · Firecrawl · OpenAI
                                       └─▶ RecordRoom: validated results saved and synced to every open session
```

Reading, annotating, choosing sources, and recording a decision go straight to the record room. Anything that creates records, calls a paid provider, or deletes data goes through an authenticated server action.

**Tech stack**

- **Platform:** [DeepSpace](https://docs.deep.space) 0.44.2 on Cloudflare Workers and Durable Objects
- **Frontend:** React 19, Vite, Tailwind CSS v4, file-based routing
- **Server:** Hono, with Zod validation of action inputs and model responses
- **Testing:** Vitest for unit tests; Playwright and Node WebSockets for HTTP, auth, and multi-account sync tests

## DeepSpace integrations

| Integration | Role in the product | Why it is here |
| --- | --- | --- |
| `exa/search` | Finds up to six relevant pages, with short excerpts | Helps the reader discover evidence and counterarguments before any answer is drafted. |
| `firecrawl/scrape` | Extracts the main text of a page the reader chooses | Drafts work from a saved, inspectable snapshot instead of a search snippet. |
| `openai/chat-completion` | Drafts the decision brief from the included sources | Connects findings, names uncertainty, and cites only supplied sources. Uses `gpt-4.1-mini` for fast, bounded synthesis. |

All three run through DeepSpace's integration proxy with developer billing, so the app holds no vendor API keys. Real research requires sign-in.

Calendar, messaging, payments, email, and image generation were left out because none of them helps one person reach a decision. Sharing and collaboration would need a permission and invitation model of their own, so they are outside the scope of a personal desk.

## Security and trust boundaries

- **Authentication:** DeepSpace's auth provider and verified JWTs. The app does not run its own identity service.
- **Storage and sync:** briefs and evidence live in the app's SQLite-backed `RecordRoom`. Native subscriptions update other sessions without polling, and ownership is enforced before records reach any client, for both member and admin roles.
- **Narrow writes:** the browser can change only a brief's `finalNote` and an evidence row's `included`, `stance`, and `note`. Ownership fields are bound to the user and immutable.
- **Server actions:** DeepSpace action tools bypass record-level permissions, so every action that takes a brief ID verifies its owner first. Removing a source also verifies the source's owner and parent brief.
- **Spend control:** the browser cannot reach the generic integration proxy, which returns `403`. Only validated research actions can call providers. The `ResearchBudget` Durable Object handles counter increments one at a time, so concurrent requests cannot exceed a limit.
- **Untrusted content:** page text, notes, and model output are rendered as text, never as HTML. Captured URLs must be public HTTPS addresses; credentials, IP addresses, local hostnames, and non-standard ports are refused.

## Design decisions and limits

**The main tradeoff: the reader chooses the evidence, not an autonomous research agent.** Margin could run an agent that searches, reads, and answers in one step. Instead, searching, saving a page, and drafting are separate actions, and only sources the reader has saved and included reach the model. This costs a few extra clicks and makes a brief slower to produce. In return, every claim in a draft cites a page the reader saved and can open, the server can reject any citation outside that set, and each paid call is a single bounded request. The limits below follow from this choice.

| Limit | Value |
| --- | --- |
| Briefs per account | 20 |
| Saved sources per brief | 8 |
| Sources per draft | 2 to 6 |
| Daily per-person limits (reset 00:00 UTC) | 6 searches, 12 captures, 4 drafts |
| Daily cap across all users | 100 paid research calls |
| Text kept per captured page | First 18,000 characters |
| Text sent to the model per source | First 9,000 characters |
| Provider deadline / per-brief lease | 95 seconds / 130 seconds (Firecrawl extraction: 25 seconds) |

- **Failed calls count toward the limits.** Re-adding a page already saved to the brief does not. Reading, annotating, and exporting keep working after a limit is reached.
- **Paid calls are never retried automatically.** A provider timeout may still have incurred a cost.
- **Research calls are bounded requests, not background jobs.** Closing the browser mid-call may mean retrying it; previously saved evidence and drafts remain.
- **Annotations are last-write-wins.** Concurrent edits to the same note keep the later one; Margin is not a collaborative text editor.

## Getting started

**Prerequisites:** Node **22.15+** or **24** (24 is pinned in `.nvmrc`), npm **11.6+**, and a DeepSpace account.

```sh
npm ci
npx deepspace auth login
npx deepspace dev start
```

The app runs at `http://localhost:5173`. Pass `--port <port>` if that port is taken. On machines with restrictive filesystem watchers, set `CHOKIDAR_USEPOLLING=1`.

**Deploy** with `npx deepspace deploy`. The app ID in `wrangler.toml` identifies this deployment; to run your own copy, follow DeepSpace's app identity and fork workflow rather than editing the ID.

## Testing

```sh
npm run validate             # type-check and unit tests
npm run lint                 # ESLint, including the Rules of Hooks
npx deepspace test run all   # HTTP, auth, and two-account WebSocket tests
```

- **Unit tests** cover malformed and counterfeit citations, stale evidence, export provenance, and URL restrictions.
- **Integration tests** cover missing and forged auth, inaccessible actions, private query filtering, cross-account refusals, forbidden field writes, forged evidence, two-session updates, and reconnect persistence.
- **Test accounts** come from the DeepSpace CLI's private account registry. Create two with `deepspace test accounts create` (see `--help`), passing each password through `--password-stdin`; never put passwords in source or on the command line. Without accounts, authenticated suites are skipped. Tests create prefixed, disposable records and remove only those.

To run the suites against a running local or deployed app:

```sh
MARGIN_BASE_URL=http://127.0.0.1:5173 npx playwright test --config tests/playwright.config.ts
```

The **live integration check** is opt-in because it spends DeepSpace credits: one Exa search, two Firecrawl captures, and one OpenAI draft, with no mocks or retries.

```sh
MARGIN_LIVE_CHECK=1 npx deepspace test run tests/live.spec.ts
```

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/actions/index.ts` | Authorized search, capture, drafting, creation, and deletion, including the drafting prompt |
| `src/domain.ts` | Brief types, the draft schema, citation validation, stale-evidence detection, export, URL rules |
| `src/schemas/research-schema.ts` | Collection ownership and writable-field policies |
| `src/server/research-budget.ts` | Atomic daily limits and per-brief operation leases |
| `src/pages/(app)/home.tsx` | Live record data and the isolated example-desk state |
| `src/components/ResearchDesk.tsx`, `src/components/research/` | Desk shell, evidence review, source reader, decision form, export |
| `src/components/ui/` | Shared UI primitives |
| `src/desk.css`, `src/themes.css`, `src/color-mode.ts` | Styles, design tokens, and color scheme |
| `worker.ts` | Platform wiring, the budget binding, and the integration-proxy block |
| `tests/` | HTTP and WebSocket tests, and the opt-in paid integration check |

## Roadmap

- Retrieval dates and source-completeness feedback in drafts.
- Smarter excerpting of long pages, so key passages are not cut off by the prompt window.
- Versioned brief history.
- Version-checked annotation updates in place of last-write-wins.
- Background jobs, once research needs to run longer than a single bounded call.
- Sharing, after its permission model is designed and revoked access is tested.
