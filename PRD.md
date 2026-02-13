# PRD.md | Project Saelo

**Product Name:** Saelo
**Tagline:** Your Digital Atmosphere.
**Version:** 1.4
**Last Updated:** Feb 11, 2026
**Core Stack:** React Native (Expo), Supabase (Auth/DB/Vector), n8n (Orchestration), Gemini 2.0 Flash (LLM)

---

## 1. Product Vision

Saelo is a voice-first orchestration layer that sits above existing SaaS tools (Gmail, Slack, Notion, Stripe, Salesforce, GitHub, etc.). Instead of switching between apps, users issue natural-language commands and queries through a single interface.

**Core principles:**
- **Voice-first:** The UI is secondary to the intent engine. Interaction should feel effortless.
- **Orchestration, not competition:** Saelo doesn't replace tools — it commands them.
- **Clarity at a glance:** Every design choice minimizes cognitive load.
- **Absolute agency:** Users query their digital life in real-time rather than performing manual data entry.

---

## 2. Current Status

### Complete
- Voice engine (STT via Deepgram, classification via Gemini 2.0 Flash)
- ReviewModal with editable fields and confidence bar
- Haptic feedback patterns + ProcessingShimmer UX
- Supabase backend (11 tables, all with RLS, 16 Edge Functions — all deployed)
- Auth (PKCE flow — email/password + Google + Microsoft sign-in)
- LOG intent execution (direct DB writes)
- QUERY intent execution (5 n8n workflows, all active)
- ACT intent execution (split routing — 5 internal + 2 external via n8n)
- Per-user Google token passthrough for ACT/email and ACT/event
- Device contact sync (expo-contacts to Supabase, deduplication)
- Brand identity (Roman gold palette, Playfair Display, logo)
- 7-screen onboarding flow with auth gate + real OAuth on Connect Cosmos
- Google Suite Integration Hub (OAuth data access, sync, disconnect, UI)
- Notion OAuth integration (connect/disconnect, workspace info stored)
- Slack OAuth integration (connect/disconnect, token revocation)
- Microsoft OAuth integration (Outlook + OneDrive, connect/disconnect, Graph API)
- Mock data removal from all tab screens + empty states
- Build verified (0 errors, 2717 modules)

### In Progress — Email Data Logic
- **CRITICAL BUG:** `google-sync` edge function writes wrong column names → Inbox is always empty
- Email schema migration needed (add `provider`, `external_id`, `label` columns)
- InboxScreen UI overhaul (provider badges, account filter, AI labels)
- Outlook email sync (microsoft-sync edge function)
- AI-powered label classification (Gemini auto-categorizes: Work, Personal, School, etc.)
- Smart send-from account selection (AI picks account, user overrides in ReviewModal)

### Next Up
1. Calendar data logic — Google Calendar + Outlook Calendar sync with proper schema
2. Drive/OneDrive file sync — file metadata import
3. Notion page import — page picker, workspace project linking
4. Wire remaining integrations — Stripe (→ Finances), GitHub, Dropbox, Salesforce, Monday.com
5. Dashboard widgets — revenue feed, inbox summary, upcoming events
6. Unified Ledger — semantic search and summarization across all connected data

---

## 3. Brand Identity & Design System

### 3.1 Aesthetic Direction

**Minimalist Roman-empire-era, Mediterranean luxury.** Clean, warm, and premium. Think marble, gold, sandstone. The visual language evokes authority and calm.

### 3.2 Logo

- **Icon mark:** Gold Greek key meander ring (outer) + black Ionic pillar (inner)
- **Wordmark:** "SAELO" in Playfair Display serif font
- **Files:** `assets/logo-icon.png`, `assets/logo-text.png`

### 3.3 Color Palette

| Token | Hex | Role |
|-------|-----|------|
| `primary` | `#D4AF37` | Roman Gold — buttons, accents, active tab, FAB |
| `primaryDark` | `#B8960C` | Pressed/hover state |
| `primaryLight` | `#EDD9B3` | Light gold tint, subtle highlights |
| `background` | `#F7E7CE` | Warm cream — all page backgrounds |
| `backgroundLight` | `#FDF5E6` | Old Lace — lighter variant |
| `backgroundDark` | `#EDD9B3` | Gold-tinted background |
| `surface` | `#FFFFFF` | Cards, modals, input fields |
| `surfaceLight` | `#FDF8F0` | Warm white surface variant |
| `textPrimary` | `#3B3831` | Dark charcoal — headings, primary text |
| `textSecondary` | `#7A7468` | Warm gray — body, descriptions |
| `textDisabled` | `#B5AFA6` | Muted warm gray |
| `textOnPrimary` | `#3B3831` | **Black** on gold buttons (premium serif feel) |
| `success` | `#6B8E4E` | Olive green — confirmations, grants |
| `error` | `#C0392B` | Deep red — errors, denied |
| `warning` | `#D4AF37` | Gold — warnings (doubles as primary) |
| `info` | `#5B7B9A` | Slate blue — informational |
| `accent` | `#584738` | Mahogany — secondary accent |
| `accentLight` | `#8B7355` | Warm brown |
| `border` | `#DDD5C8` | Warm border |
| `borderLight` | `#EAE4DA` | Lighter border |
| `overlay` | `rgba(59,56,49,0.5)` | Warm dark overlay |

### 3.4 Typography

| Usage | Font | Weight | Notes |
|-------|------|--------|-------|
| Headings (h1-h3) | Playfair Display | Bold (700) | Serif, classical feel |
| Button text | Playfair Display | Bold (700) | Black text on gold |
| Subtitle | Playfair Display | SemiBold (600) | — |
| Body text | System font | Regular (400) | Sans-serif contrast |
| Caption | System font | Regular (400) | Small descriptive text |

**Package:** `@expo-google-fonts/playfair-display`

### 3.5 Button System

**GlassButton** — Primary button component:
- Semi-transparent gold background: `rgba(212, 175, 55, 0.15)`
- 1px border: `rgba(212, 175, 55, 0.3)`
- Border radius: 16px
- Text: Playfair Display Bold, `#3B3831`
- **Variants:** "gold" (primary action), "glass" (secondary/skip)

### 3.6 Icon System

- **Library:** `lucide-react-native`
- **Primary icon color:** `#D4AF37` (Roman Gold) for onboarding and accent usage
- **Standard icon color:** `#3B3831` (text primary) for navigation and content

---

## 4. Functional Requirements

### 4.1 Onboarding Flow (7 Screens)

7-screen first-run experience. Gated in `App.js` via `!user || !onboardingCompleted` from `AuthContext`. Tracked via `profiles.onboarding_completed` column in Supabase.

**Screen 1: Splash / Brand**
- Logo icon (120px) + "SAELO" wordmark + "Say More. Do Less." tagline
- Fade-in animation sequence (logo → text → tagline)

**Screen 2: Meet Saelo**
- Logo hero (160px) + app description

**Screen 3: Just Speak (Voice Education)**
- Large gold Mic icon centered, 5 smaller icons orbiting
- 3 rotating example command pills with diagonal wave shimmer

**Screen 4: Enable Voice (Permissions)**
- Microphone permission (required), Contacts permission (optional, native only)
- Continue disabled until mic granted

**Screen 5: Create Account / Sign In (Auth)**
- Email/password + "Continue with Google" + "Continue with Microsoft"
- Auth creates user session; ProgressDots gated — can't skip past this step

**Screen 6: Connect Your Cosmos (Integrations)**
- 3-column grid with 11 brand PNG icons
- Gmail/Drive → real Google OAuth; Outlook/OneDrive → real Microsoft OAuth; Slack → real Slack OAuth; Notion → real Notion OAuth
- Stripe, GitHub, Salesforce, Dropbox, Monday.com → "Coming Soon"

**Screen 7: You're All Set**
- Sandstone background, animated gold check, shimmer suggestion pills
- "Get Started" → `completeOnboarding()` → main app

### 4.2 Voice & Intent Engine

| Capability | Status |
|---|---|
| Deepgram STT with shimmer processing indicator | Complete |
| Gemini 2.0 Flash intent classification (Log/Query/Act) | Complete |
| Editable ReviewModal for intent correction | Complete |
| Haptic feedback patterns | Complete |
| 30s timeout with 2 retries | Complete |
| Contextual buffering (last 3 interactions) | Future |

### 4.3 Email System (In Progress)

| Capability | Status |
|---|---|
| Gmail sync (20 recent messages) | Broken — schema mismatch, fix planned |
| Outlook sync (Microsoft Graph API) | Planned (Phase 3) |
| Provider badges (Gmail/Outlook) per email | Planned (Phase 2) |
| Account filter dropdown in Inbox | Planned (Phase 2) |
| AI label classification (Work/Personal/School/etc.) | Planned (Phase 4) |
| Smart send-from account selection | Planned (Phase 5) |
| Outlook sending via Graph API (no n8n needed) | Planned (Phase 5) |

### 4.4 Dashboard (Not Started)

| Widget | Description |
|---|---|
| **Revenue Stream** | Real-time income feed from Stripe, bank APIs, and manual logs |
| **AI Invoice Inbox** | PDFs detected in email/Slack, pre-parsed via OCR |
| **Asset Health Monitor** | Aggregated storage meter across cloud drives |
| **Adaptive Hero** | Dynamic header by time-of-day and pending urgency |
| **App Widgets** | Miniature control panels for connected apps |

### 4.5 Unified Ledger (Not Started)

| Capability | Requirement |
|---|---|
| **Multi-platform sync** | Tasks, documents, etc. logged as ledger events |
| **Semantic search** | Natural-language queries across all data |
| **Transaction normalization** | Auto-converts currencies and date formats |
| **Background summarization** | Clusters similar events every 6 hours |
| **Audit trail** | Permanent record of automation actions |

### 4.6 Integration Hub

| Capability | Status |
|---|---|
| Google OAuth (Gmail + Calendar + Drive) | Complete (OAuth), Sync broken (fix planned) |
| Microsoft OAuth (Outlook + OneDrive) | Complete (OAuth), Sync planned |
| Notion OAuth | Complete (connect/disconnect), Import deferred |
| Slack OAuth | Complete (connect/disconnect) |
| Stripe OAuth | Not started |
| GitHub, Dropbox, Salesforce, Monday.com | Not started ("Coming Soon") |
| Data export (JSON/CSV) | Not started |

---

## 5. Technical Architecture

### 5.1 Backend & Orchestration

| Component | Role |
|---|---|
| **n8n** | Workflow engine — external API calls, data transforms |
| **Supabase Edge Functions** | Voice processing, OAuth flows, data sync, sensitive logic |
| **Supabase Vector Store** | Document embeddings for RAG queries (future) |
| **Supabase Real-time** | Push updates to UI without polling (future) |

### 5.2 n8n Workflow Architecture

**Strategy: Pre-built workflows, not dynamic generation.**

| Intent Type | Routing | Status |
|-------------|---------|--------|
| **LOG** | Direct to Supabase tables | Complete |
| **QUERY** | n8n webhook → workflow → LLM response | Complete |
| **ACT** | Split: internal → Supabase, external → n8n | Complete |

**ACT Split Routing Design:**
- **External** (email, calendar event) → n8n webhook → Google API → confirmation
- **Internal** (todo, workspace, contact, transaction, draft) → direct Supabase writes (reuses LOG handlers, saves n8n executions)
- All ACT intents require ReviewModal confirmation before executing
- **Planned:** Outlook email sending via Microsoft Graph API directly in edge function (no n8n workflow)

**QUERY Workflows (All Active):**

| Workflow | n8n ID | Data Source |
|----------|--------|-------------|
| `saelo-calendar-query` | `Xpkbh0cNV0nTYBBi` | Google Calendar (OAuth2) |
| `saelo-finance-query` | `3DzUaAEzOtpsA0P8` | Supabase REST (transactions) |
| `saelo-contacts-query` | `uI4Jz4GAzc14waTO` | Supabase REST (contacts) |
| `saelo-tasks-query` | `4vxdrMyeHuFrOHuI` | Google Tasks (OAuth2) |
| `saelo-generic-query` | `IuPzEP2x7kChzzeo` | None (pure LLM fallback) |

**ACT Workflows (Active):**

| Workflow | n8n ID | Action |
|----------|--------|--------|
| `saelo-send-email` | `WhoQzlrmTLROjyiU` | Gmail Send (per-user Bearer token) |
| `saelo-create-event` | `rF6hezxrnRxr0ENK` | Google Calendar Create (per-user Bearer token) |

All QUERY workflows use Basic LLM Chain + Gemini 2.0 Flash. ACT workflows use HTTP Request nodes with per-user Bearer tokens. n8n Cloud: **2,500 monthly executions**.

---

## 6. Security & Privacy

| Requirement | Detail |
|---|---|
| **Row-Level Security** | All 11 tables with user-scoped RLS policies |
| **Secret management** | All secrets via Supabase Vault or n8n Credentials |
| **Ephemeral voice processing** | Audio processed in-memory, never stored |
| **Webhook validation** | Signed HMAC headers on incoming webhooks |

---

## 7. UI/UX Design Principles

| Principle | Detail |
|---|---|
| **Roman minimalism** | Warm cream backgrounds, gold accents, Playfair Display serif |
| **Luxury restraint** | Clean layouts, generous whitespace |
| **Haptic affirmation** | Vibration patterns for recording, execution, errors |
| **Shimmer processing** | Visual feedback during voice processing |
| **Onboarding-first** | 7-screen first-run experience |
