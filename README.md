# Margin

A little research. A clearer decision.

Margin is a private research desk for decisions that deserve more than an instant AI answer. Start with a specific question, read a few sources, annotate what supports or challenges the idea, and draft a brief you can trace back to the evidence. Your own decision stays separate from the AI draft.

Built with **DeepSpace 0.44.2**, React, Hono, and Cloudflare Durable Objects.

## The finished flow

1. Sign in and open a brief with a question and your constraints.
2. Search for evidence or add a public HTTPS page.
3. Read and save page text. Add an annotation, choose a stance, and include or set aside the source.
4. Draft from two to six included sources. Inspect the citations, counterargument, and unanswered questions.
5. Record your own decision and download a Markdown brief with source links and research notes.

Changing the selected evidence or an annotation marks the existing draft stale. Old drafts keep their source references even after a source is removed. Failed searches, extractions, or model calls preserve the previous successful work and offer a local retry.

The signed-out desk is an interactive, explicitly labeled **curated example**. Its text and redrafts are illustrative fixtures, not live provider output; edits stay in memory. Real research uses the three integrations below and persists to DeepSpace.

## Why these three integrations

| DeepSpace integration | Job in the product | Why it earns its place |
| --- | --- | --- |
| `exa/search` | Find up to six relevant pages, with short excerpts | Helps the reader discover evidence and counterarguments without generating a premature answer. |
| `firecrawl/scrape` | Extract the main text of a selected public page | Saves an inspectable snapshot instead of drafting from a search snippet alone. |
| `openai/chat-completion` | Turn selected snapshots and annotations into a structured decision brief | Connects findings, identifies uncertainty, and cites only supplied source IDs. Uses `gpt-4.1-mini` for bounded, fast synthesis. |

All three use DeepSpace's integration proxy and developer billing. There are no vendor API keys in the app. Sign-in is required for real research. The public example makes no paid calls.

No calendar, messaging, payments, image generation, or email integration was added. None is needed to complete this decision workflow. A share/collaboration system would require a deliberate permission and invitation design; it is outside this personal-desk scope.

## Platform primitives and trust boundaries

- **Authentication:** the scaffold's DeepSpace auth provider and verified JWTs. The app does not implement an identity service.
- **Storage and sync:** `briefs` and `evidence` live in the app's SQLite-backed `RecordRoom`. Native subscriptions update other sessions without polling. Ownership is enforced before records reach clients, for both member and admin roles.
- **Narrow writes:** the browser can only change a brief's `finalNote` and an evidence row's `included`, `stance`, and `note`. Creation, provider output, source text, and deletion go through server actions. Ownership fields are user-bound and immutable. Confirmed mutations are used for trusted save feedback.
- **Privileged actions:** DeepSpace action tools bypass record RBAC, so every action that accepts a brief ID explicitly verifies its owner. Source deletion also verifies the source's owner and parent brief.
- **Spend control:** the generic browser integration proxy is denied. Only validated research actions may invoke providers. A native `ResearchBudget` Durable Object serializes counter increments and expiring per-brief leases. This is app-specific policy; auth, record sync, and the integration proxy remain platform primitives.
- **AI boundary:** page text and notes are untrusted data. The model receives only the selected source snapshots, no browsing tools and no write tools. Zod checks its response shape, and the server refuses every citation outside the supplied evidence set. The UI renders provider text as text, not executable HTML.

A valid citation proves **which supplied source was referenced**, not that the model interpreted it correctly. The reader can inspect the saved text and original page before making a decision.

## Deliberate bounds and tradeoffs

- 20 briefs per account; eight saved sources per brief; two to six sources per draft.
- Six searches, 12 captures, and four draft attempts per person per UTC day. A shared cap of 100 paid research attempts per day protects the evaluation deployment. Failed attempts also count. Reading, annotation, and export continue after limits are reached.
- Captures retain the first 18,000 characters of main page text. A draft receives at most the first 9,000 characters per included source. These bounds keep prompts and storage predictable; a reader must open the original for material beyond the saved window.
- A search and a capture are separate actions. This costs one deliberate click, but avoids extracting irrelevant results and makes source selection part of the product.
- Each provider action has a server deadline of 95 seconds, inside a 130-second operation lease; Firecrawl's extraction timeout is 25 seconds. Paid calls are never automatically retried. A provider timeout can still have incurred provider cost.
- Research calls are bounded request/response actions, not a background research agent. They are not resumable jobs. A closed browser or interrupted Worker can require retrying a call; previously saved evidence and drafts remain. Durable background jobs would be the next step if the product grows into long research runs.
- Text annotations use normal confirmed record updates. Concurrent edits to the same annotation follow last-write-wins behavior; this is not a collaborative text editor.

## Run locally

Use a supported Node line (Node **24** is pinned in `.nvmrc`) and **npm 11.6+**.

```sh
npm ci
npx deepspace auth login
npx deepspace dev start
```

The app is served at `http://localhost:5173`. Use `--port 5187` if another project uses that port. On a machine with restrictive filesystem watchers, set `CHOKIDAR_USEPOLLING=1`.

The app ID in `wrangler.toml` identifies this deployment. To create your own independent deployment from a clone, follow DeepSpace's app identity/fork workflow; do not silently replace its ID while working on this app.

## Verify

```sh
npm run validate                   # TypeScript + domain tests
npm run lint                       # Rules of Hooks
npx deepspace test run all          # HTTP + auth + real two-account WebSocket checks
```

Authenticated tests use test accounts from the DeepSpace CLI's private account registry. Provision two using `deepspace test accounts create --help` and `--password-stdin`; do not put passwords in source or argv. Without usable accounts, the authenticated suites explicitly skip. Tests create prefixed disposable records and remove only those records.

The API and WebSocket tests use Playwright's request runner and Node WebSockets, so they require no local Chromium process. The UI also needs an actual browser review; HTTP smoke checks alone do not prove it renders.

For a running local or deployed app:

```sh
MARGIN_BASE_URL=http://127.0.0.1:5173 npx playwright test --config tests/playwright.config.ts
```

The bounded **live integration check is opt-in** and spends the owner's DeepSpace credits: one Exa search, two different Firecrawl captures (the minimum evidence set), and one OpenAI draft. There are no provider mocks or automatic retries.

```sh
MARGIN_LIVE_CHECK=1 npx deepspace test run tests/live.spec.ts
```

The regular suites verify missing/forged auth, inaccessible actions, private query filtering, cross-account action refusals, forbidden field writes, forged evidence creation, two-session updates, and reconnect persistence. Domain tests cover malformed/counterfeit citations, stale evidence, export provenance, and URL restrictions.

## Source map

| File | Responsibility |
| --- | --- |
| `src/pages/(app)/home.tsx` | Real RecordRoom data/controller and isolated example state |
| `src/components/ResearchDesk.tsx` + `src/components/research/` | Desk shell, evidence review, citation reader, decision form, and export |
| `src/domain.ts` | Brief types, citation validation, stale-input detection, export, and URL normalization |
| `src/actions/index.ts` | Authorized search, capture, drafting, creation, and deletion |
| `src/schemas/research-schema.ts` | Native collection ownership and writable-field policies |
| `src/server/research-budget.ts` | Atomic daily request limits and operation leases |
| `worker.ts` | Standard platform wiring, custom budget binding, and proxy denial |
| `tests/` | Real HTTP/WebSocket tests and explicit paid integration check |

## What I would do next

First, add document-level source completeness feedback and retrieval dates in the draft, then improve how long pages are excerpted so important passages do not fall outside the prompt window. Next, add a versioned brief history and conditional note updates. I would add background jobs only when research can exceed the current bounded calls, and sharing only after defining its permission model and testing revoked access.

## Agent use and applicant verification

Codex selected the focused concept, read the DeepSpace docs and two example repositories (StoryNest and ThreadHunt), scaffolded the app, implemented its product and security boundaries, wrote the tests, and ran the automated and browser checks. The applicant completed the DeepSpace login and approved publication of the public GitHub repository.

Agent-run checks are documented separately from the applicant's own verification. Before submitting, the applicant should personally walk through a new brief, inspect the source text and citations, change an annotation, observe the stale-draft notice, record a decision, export, and reload. The submission note must accurately describe that personal review; it must not present the agent's testing as the applicant's work.
