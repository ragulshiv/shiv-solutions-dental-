# CLAUDE.md: how this project is put together

Dental clinic management system for Indian clinics: patients, appointments, treatments, billing (GST), inventory, CRM, lab, video consults, a patient portal, and AI helpers.
Product: **ChairOS** (name, wordmark and version live in `config/brand.ts`; never hard-code the product name). Started from the MIT-licensed `abinauv/dental-erp`: its licence must stay in `licenses/dental-erp-MIT.txt` and `NOTICE.md`. Everything else is ours.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma 5 + MySQL 8.4 · NextAuth v5 · Tailwind + shadcn/ui (Radix) · Vitest (unit/API) · Playwright (e2e) · Docker.

## Where things live

| Path                        | What                                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(dashboard)/<module>/` | Staff screens: one folder per module (patients, appointments, billing, treatments, inventory, crm, lab, reports, settings, staff, …). `page.tsx` is the list, `[id]/page.tsx` the detail, `new/page.tsx` the create form.                  |
| `app/(auth)/`               | Login, signup, invite, verify-email, pricing                                                                                                                                                                                               |
| `app/(onboarding)/`         | First-run clinic setup. Outside `(dashboard)` on purpose: that layout redirects unfinished clinics here, so nesting it would loop.                                                                                                         |
| `app/portal/`               | Patient-facing portal (own auth: `lib/patient-auth.ts`)                                                                                                                                                                                    |
| `app/api/<module>/`         | REST endpoints (`route.ts` with GET/POST/PUT/DELETE). Mirrors the module names above.                                                                                                                                                      |
| `prisma/schema.prisma`      | The database (81 models). `prisma/migrations/` is the history; `prisma/seed.ts` is the demo data.                                                                                                                                          |
| `lib/`                      | Shared logic: `api-helpers.ts` (auth + role guard for every API route), `auth.ts` (NextAuth), `prisma.ts` (client), `*-utils.ts` (appointment / billing / treatment helpers), `ai/`, `services/`, `storage/`, `payment-gateways/`, `i18n/` |
| `components/ui/`            | Design-system primitives (Button, Card, Table, Badge, Input, Tabs, Dialog, …). **Restyle here, not in pages.**                                                                                                                             |
| `components/layout/`        | App shell: sidebar, mobile sidebar, header, search, notifications                                                                                                                                                                          |
| `components/<module>/`      | Module-specific widgets (dental-chart, billing, appointments, ai, …)                                                                                                                                                                       |
| `config/nav.ts`             | Sidebar menu and which roles see which item                                                                                                                                                                                                |
| `messages/`                 | UI strings (en-IN, en-US)                                                                                                                                                                                                                  |
| `tests/`                    | `api/`, `unit/`, `components/`, `integration/`, `security/`, `e2e/` (Playwright), …                                                                                                                                                        |

## Clinics (multi-tenant)

Each clinic is a `Hospital` row. A clinic owner creates one at `/signup` (clinic name + admin login), verifies their email, then finishes `/onboarding`. Every staff user, patient and record carries `hospitalId`, so clinics never see each other's data. Admins add their own staff from Staff → Invite. The clinic's name and logo are set in Settings → Clinic and show in the sidebar.

## Installable app (PWA) and load speed

- `public/manifest.json` + icons (`public/icon-*.png`, made from the navy/teal "S" mark) make the site installable: Android Chrome shows "Install", iPhone uses Share → Add to Home Screen. `components/pwa/install-app-button.tsx` shows the button (header + login/sign-up screens) only where installing is possible.
- `public/sw.js` caches only hashed build files and icons, **never pages or `/api/`** (patient data stays server-side). Bump its `VERSION` if you change icons or the caching rules. It is registered in production only (`components/pwa/service-worker-register.tsx`).
- Installing requires https: the Tailscale URL or a real domain. `middleware.ts` lets these files through without login.
- Heavy libraries load on demand: dashboard charts live in `components/dashboard/dashboard-charts.tsx` and are imported with `next/dynamic`. Do the same for any new heavy widget so it doesn't slow the first screen.

## Patterns to follow

**API route.** Every handler starts with the guard and scopes every query by `hospitalId` (multi-tenant):

```ts
const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
if (error || !hospitalId)
  return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// ...prisma.x.findMany({ where: { hospitalId, ... } })
```

**Pages** are client components that `fetch('/api/...')` and render with `components/ui`. Copy the nearest sibling page's structure: header (`h1` + description + actions), filters Card, Table, pagination.

**Dates:** `Appointment.scheduledDate` is date-only (`@db.Date`); the time is a separate `scheduledTime` string `"HH:mm"`. Display the time with `formatTime()` from `lib/appointment-utils.ts`. Never read the time from `scheduledDate`, because it shows 05:30 (UTC midnight in IST). Compare date-only columns against `startOfDay(now)`, not `now`.

**Money / GST:** use `lib/billing-utils.ts`; don't recompute tax inline.

## Design system: mobile-first SaaS (Linear/Stripe style)

- **Mobile first.** Write the phone layout first, then scale up with `md:` / `lg:`. Phones get a bottom tab bar (`components/layout/bottom-nav.tsx`: Dashboard, Patients, Appointments, Billing + More), and More opens the slate-900 drawer. The desktop sidebar starts at `md:`. The main area has `pb-24` on phones so the tab bar never covers content.
- **Touch targets ≥ 44px on phones.** Button, Input, Select and Tabs are already `h-11` on phones and compact again from `md:`. Keep that for any custom tappable element (`min-h-11`).
- **Colours** are HSL tokens in `app/globals.css` (`:root` light, `.dark` dark): zinc/slate neutrals, slate-900 text, slate-600 secondary text (don't lighten it; pale grey read as washed out), teal-700 filled buttons (white text passes contrast), teal-600 rings and active states, slate-900 `--sidebar-*`. **Never hard-code hex or `gray-500` style colours in pages.**
- **Type:** one family, Inter (`app/layout.tsx`). No serif anywhere except the ℞ glyph on printed prescriptions. Page titles `text-2xl md:text-3xl font-semibold tracking-tight`; section headers `font-semibold`; subtext `text-sm text-muted-foreground`; numbers and money `tabular-nums tracking-tight`.
- **Cards:** `rounded-xl border-border/60 shadow-card`, with `p-4` on phones and `p-6` from `md:` (built into `components/ui/card.tsx`).
- **KPI rows:** `grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4`; never one full-width small card per row on phones. Trends are pills (emerald up / rose down, with an arrow); see `trendPill` in the dashboard page.
- **Empty spots inside cards:** use `EmptyHint` (`components/ui/empty-hint.tsx`), a soft teal banner with a Sparkles icon and one actionable tip. Use `EmptyState` only for a whole empty list page.
- Status colours: Badge variants `success` / `warning` / `info` / `destructive`. Charts: `lib/chart-theme.ts` (`--chart-1..6`).

## Adding a feature (checklist)

1. Branch: `git switch -c feature/<name>`
2. Schema change? Edit `prisma/schema.prisma` → `npx prisma migrate dev --name <name>` (dev DB on :3306).
3. API: `app/api/<module>/route.ts` with the guard above.
4. Screen: `app/(dashboard)/<module>/…/page.tsx`. Add to `config/nav.ts` if it needs a menu entry.
5. Tests: add `tests/api/<module>.test.ts` (mock prisma like the neighbours).
6. Verify: `npx tsc --noEmit` · `npm test` (all must pass; baseline 4,356 tests) · check in the browser preview.
7. Commit on the branch and push it (`git push -u origin feature/<name>`). A pre-push hook runs the full test suite before every push.
8. **When the owner says OK**, Claude merges it: `git switch main && git pull`, `git merge --no-ff feature/<name>`, then `ALLOW_PROTECTED_PUSH=1 git push origin main` (the hook blocks plain pushes to `main` as a guard; the tests still run). Then run `clinic-start.cmd` to rebuild the live clinic app and check it over Tailscale. Never merge or deploy without that OK.

Repo: `origin` = github.com/ragulshiv/shiv-solutions-dental- (private, ours). `upstream` = the original abinauv/dental-erp, fetch-only, for reference. The local branch `archive/original-history` keeps the pre-v1.0 history; never push it.

## Running it

- **Dev preview (safe, demo data):** dev DB `docker compose -f docker-compose.dev.yml up -d`, then `npm run dev` (port 3000) or the `dental-erp-preview` launch config (port 3001, so it can run alongside the clinic app). Demo login is in `prisma/seed.ts`.
- **Live clinic stack:** `clinic-start.cmd` builds `dental-erp:clinic` from this folder with `.env.clinic`. App on 127.0.0.1:3000, MySQL on 127.0.0.1:3307, phones via Tailscale `https://shiv.taile1db70.ts.net`.
- **Backups:** `clinic-backup.ps1`
- Before any Docker build, run `git checkout package-lock.json`. The laptop's npm rewrites the lock file, which breaks `npm ci`.
