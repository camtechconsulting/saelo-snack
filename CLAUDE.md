# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Saelo ("Your Digital Atmosphere") is a voice-first React Native mobile app built with Expo. It acts as a universal orchestration layer over existing SaaS tools (Gmail, Slack, Notion, Stripe, etc.), transforming fragmented digital noise into structured, actionable data.

**Current state:** All 3 intent types (LOG, QUERY, ACT) fully operational. 16 edge functions deployed. 7 n8n workflows active. Auth = Email/password + Google + Microsoft. 4 integrations wired (Google, Notion, Slack, Microsoft). CRITICAL: Email sync broken — `google-sync` writes wrong column names. Email data logic overhaul planned.

**Stack:** React Native (Expo) · Supabase (Auth, DB, Edge Functions) · n8n (workflow orchestration) · Gemini 2.0 Flash (LLM)

## Quick Start

**Always read first:** `.claude/SESSION_HANDOFF.md` — contains current state, next steps, and context.

```bash
npx expo start          # Start Expo dev server
npx expo start --web    # Run in web browser (recommended for Windows dev)
```

## Brand Identity

**Aesthetic:** Minimalist Roman-empire-era, Mediterranean luxury
**Tagline:** "Say More. Do Less."

### Logo

- **Icon:** Gold Greek key meander ring + black Ionic pillar (`assets/logo-icon.png`)
- **Wordmark:** "SAELO" in Playfair Display serif (`assets/logo-text.png`)

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#D4AF37` | Roman Gold — buttons, accents, active states |
| `primaryDark` | `#B8960C` | Pressed/hover states |
| `primaryLight` | `#EDD9B3` | Light gold tint |
| `background` | `#F7E7CE` | Warm cream — page backgrounds |
| `backgroundLight` | `#FDF5E6` | Old Lace — lighter variant |
| `surface` | `#FFFFFF` | Cards, modals |
| `textPrimary` | `#3B3831` | Dark charcoal — headings, body |
| `textSecondary` | `#7A7468` | Warm gray — secondary text |
| `textOnPrimary` | `#3B3831` | Black on gold buttons (premium feel) |
| `success` | `#6B8E4E` | Olive green |
| `error` | `#C0392B` | Deep red |
| `accent` | `#584738` | Mahogany — secondary accent |
| `border` | `#DDD5C8` | Warm border |

### Typography

- **Headings + buttons:** Playfair Display Bold (serif) — `@expo-google-fonts/playfair-display`
- **Body text:** System font (sans-serif contrast)
- **Button text on gold:** Black (#3B3831), not white

### Button Style

- **GlassButton:** Semi-transparent gold tint + Playfair Display text
- **Variants:** "gold" (primary actions), "glass" (secondary/skip)

## Architecture

### Navigation (App.js)

- **Onboarding gate:** New users see 7-screen onboarding (auth at step 5, completion at step 7) before main app
- **Bottom tab navigator** with 5 tabs: Inbox, Calendar, Network, Workspace, Finances
- **Stack screens**: Account, ProjectDetail
- **Global modal state** managed at App level (`infoCard`, `reviewModal`)

### Voice Engine (Complete)

Data flow: Record → Deepgram STT → Gemini classification → ReviewModal → execute

| Component | File | Purpose |
|-----------|------|---------|
| `useVoiceRecorder` | `hooks/useVoiceRecorder.js` | expo-av audio recording |
| `VoiceContext` | `contexts/VoiceContext.js` | Global state, persistence, timeout/retry |
| `ProcessingShimmer` | `components/ProcessingShimmer.js` | Shimmer overlay during processing |
| `ReviewModal` | `components/reviewModal.js` | Intent display, editable fields, confidence bar |

### Edge Functions (Supabase — 16 deployed, all saved locally)

| Function | JWT | Purpose |
|----------|-----|---------|
| `process-voice` | Required | Deepgram STT + Gemini classification (LOG/QUERY/ACT) |
| `execute-intent` | Required | Routes all 3 intents; per-user Google token passthrough for ACT |
| `google-oauth-start` | Required | Google OAuth URL with read+write scopes |
| `google-oauth-callback` | None | Handles redirect, exchanges code, stores tokens |
| `google-sync` | Required | Pulls Gmail + Calendar into Supabase (**BROKEN — column mismatch**) |
| `google-disconnect` | Required | Revokes token, marks disconnected |
| `notion-oauth-start` | Required | Notion OAuth consent URL |
| `notion-oauth-callback` | None | Exchanges code, stores token + workspace info |
| `notion-disconnect` | Required | Clears token, marks disconnected |
| `slack-oauth-start` | Required | Slack OAuth consent URL with user_scope |
| `slack-oauth-callback` | None | Exchanges code, stores user token + team info |
| `slack-disconnect` | Required | Revokes token via auth.revoke, clears stored token |
| `microsoft-oauth-start` | Required | Microsoft OAuth consent URL (Outlook + OneDrive) |
| `microsoft-oauth-callback` | None | Exchanges code, stores tokens + fetches email from Graph |
| `microsoft-disconnect` | Required | Clears tokens, marks disconnected |
| `test-secrets` | — | Dev utility |

### Intent Routing (All 3 Types — Complete)

| Intent | Route | Handler |
|--------|-------|---------|
| **LOG** | Direct Supabase | `handleLogIntent()` — expense, income, contact, event |
| **QUERY** | n8n webhook | `handleQueryIntent()` — 5 workflows (calendar, finance, contacts, tasks, generic) |
| **ACT** | Split | Internal (todo, workspace, contact, transaction, draft) → Supabase; External (email, event) → n8n with per-user Google token |

### n8n Workflow Catalog (7 total — all active)

| Workflow | n8n ID | Type |
|----------|--------|------|
| `saelo-calendar-query` | `Xpkbh0cNV0nTYBBi` | QUERY |
| `saelo-finance-query` | `3DzUaAEzOtpsA0P8` | QUERY |
| `saelo-contacts-query` | `uI4Jz4GAzc14waTO` | QUERY |
| `saelo-tasks-query` | `4vxdrMyeHuFrOHuI` | QUERY |
| `saelo-generic-query` | `IuPzEP2x7kChzzeo` | QUERY |
| `saelo-send-email` | `WhoQzlrmTLROjyiU` | ACT |
| `saelo-create-event` | `rF6hezxrnRxr0ENK` | ACT |

All QUERY workflows use Basic LLM Chain + Gemini 2.0 Flash. ACT workflows use HTTP Request nodes with per-user Bearer tokens. n8n Cloud plan: 2,500 monthly executions.

### Onboarding Flow (7 screens)

1. **Splash** — Logo + "Say More. Do Less." tagline + fade-in animation
2. **Meet Saelo** — Logo hero (160px) + app description
3. **Just Speak** — Voice education (orbiting icons + example command carousel)
4. **Enable Voice** — Mic (required) + Contacts (optional, native only) permissions
5. **Create Account / Sign In** — Email/password + Google + Microsoft auth
6. **Connect Your Cosmos** — 3-column integration grid; Gmail/Drive, Outlook/OneDrive, Slack, Notion trigger real OAuth; Stripe, GitHub, Salesforce, Dropbox, Monday.com show "Coming Soon"
7. **You're All Set** — Sandstone background, animated gold check, shimmer suggestion pills

**Auth:** Email/password + Google + Microsoft. ProgressDots gate prevents skipping past Auth.

### Database (Supabase)

**Project:** `dppcoregnmgdmnbrzcjp` (us-east-2)

| Table | Purpose |
|-------|---------|
| profiles | User profiles (`onboarding_completed` column) |
| emails | Email summaries (synced via Google/Outlook) — **schema needs migration** |
| calendar_events | Calendar events (synced via Google) — **schema needs migration** |
| contacts | Network contacts |
| workspaces | Project workspaces |
| transactions | Financial transactions |
| project_todos | Workspace todos |
| project_files | Workspace files |
| drafts | AI-generated drafts |
| voice_sessions | Voice interaction logs |
| user_integrations | OAuth tokens + connection status |

All 11 tables have RLS enabled with user-scoped policies.

**Secrets configured:** `DEEPGRAM_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

### Design System

- `styles/colors.js` — Roman gold color palette
- `styles/typography.js` — Font scale + Playfair Display presets
- `components/GlassButton.js` — Gold/glass button with shimmer animation
- `components/ProgressDots.js` — Tappable onboarding progress indicator
- Icons: `lucide-react-native`
- Integration PNGs: `assets/integrations/` (11 brand logos)

## Development Tools

| Tool | Status | Usage |
|------|--------|-------|
| **GSD** | v1.11.2 | `/gsd:*` commands for structured development |
| **n8n-skills** | 7 skills | Workflow building guidance |
| **n8n-mcp** | Connected | 20 tools via `mcp__n8n-mcp__*` |
| **Supabase MCP** | Available | Database operations (not Edge Functions) |

**n8n Instance:** `https://camtech-consulting.app.n8n.cloud` (API key auth via `.env`, 2,500 monthly executions)

## Key Files

| File | Purpose |
|------|---------|
| `App.js` | Root component, navigation, provider hierarchy, onboarding gate |
| `contexts/VoiceContext.js` | Voice state machine, persistence, API calls |
| `contexts/AuthContext.js` | Auth + onboarding state (PKCE flow, Google + Microsoft) |
| `contexts/IntegrationContext.js` | Multi-provider integration state (Google, Notion, Slack, Microsoft) |
| `components/VoiceButton.js` | FAB with pulse animation, haptics |
| `components/reviewModal.js` | Intent review with editable fields |
| `components/GlassButton.js` | Gold/glass button with shimmer |
| `lib/supabase.js` | Supabase client (localStorage fallback for web) |
| `lib/mutations.js` | Database mutation helpers |
| `lib/transforms.js` | Database row → UI object transformers |
| `screens/onboarding/OnboardingScreen.js` | 7-step onboarding |
| `screens/AccountScreen.js` | Connections with Sync Now / Disconnect |
| `screens/InboxScreen.js` | Email inbox (currently empty due to sync bug) |
| `styles/colors.js` | Roman gold color palette |
| `supabase-schema.sql` | Database schema reference (needs update for email migration) |

## Critical Bug: Email Sync

**`google-sync/index.ts` writes columns that don't exist in the `emails` table.** The function writes `gmail_id`, `from_address`, `snippet`, `labels` but the schema has `sender`, `preview`, `timestamp`, `account`. Every upsert silently fails. Same issue with calendar: writes `google_event_id` which doesn't exist.

**Fix plan:** `.claude/plans/modular-wishing-bird.md` — 5 phases covering schema migration, sync fix, InboxScreen UI, Outlook sync, AI labels, and send-from logic.

## Status

**Complete:**
- Voice engine (STT, classification, ReviewModal, haptics, timeout/retry)
- Supabase backend (11 tables, RLS, 16 Edge Functions)
- Auth (email/password + Google + Microsoft sign-in)
- All 3 intent types: LOG (direct DB), QUERY (5 n8n workflows), ACT (split routing — 5 internal + 2 external)
- Per-user Google token passthrough for ACT/email and ACT/event
- Device contact sync
- Brand identity + theme (Roman gold, Playfair Display)
- 7-screen onboarding with auth gate + real OAuth on Connect Cosmos
- Google Suite Integration Hub (connect, sync, disconnect)
- Notion OAuth (connect/disconnect, workspace info)
- Slack OAuth (connect/disconnect, token revocation)
- Microsoft OAuth (Outlook + OneDrive, connect/disconnect, Graph API)
- Mock data removal + empty states on all tab screens

**In Progress (Email Data Logic):**
- Fix email schema + google-sync column mapping (Phase 1 — CRITICAL)
- InboxScreen UI with provider badges + account filter (Phase 2)
- Outlook email sync via Microsoft Graph (Phase 3)
- AI label classification with Gemini (Phase 4)
- Smart send-from account selection (Phase 5)

**Future Roadmap:**
1. Calendar data logic — Google + Outlook calendar sync with proper schema
2. Drive/OneDrive file sync — metadata import, storage tracking
3. Notion import — page picker, workspace project linking
4. Wire remaining integrations — Stripe (→ Finances), GitHub, Dropbox, Salesforce, Monday.com
5. Dashboard widgets — revenue feed, inbox summary, upcoming events
6. Unified Ledger — semantic search across all connected data
7. Additional auth — Apple ($99/yr), Phone/Twilio (per-SMS cost)

## Code Patterns

- Screens use `useSupabaseQuery` → `transformX` → render
- Mutations in `lib/mutations.js`
- Auth via `contexts/AuthContext.js` with PKCE
- `useMemo` must be above early returns (React hooks rules)
- Null guard on data arrays in `useMemo` — Supabase returns null during loading
- Transaction sign logic: `insertTransaction` auto-negates expense amounts
- Integration wiring pattern: 3 edge functions per provider (start, callback, disconnect) + IntegrationContext extension
- Provider hierarchy: AuthProvider > IntegrationProvider > VoiceProvider

## Environment Notes

- **Platform:** Windows ARM64
- **expo-secure-store:** Native-only — `lib/supabase.js` has localStorage fallback for web
- New Architecture enabled (`newArchEnabled: true`)
- Portrait orientation only
- **Unused deps to remove:** `@expo/ngrok`, `expo-blur`, `expo-font`, `expo-status-bar`
