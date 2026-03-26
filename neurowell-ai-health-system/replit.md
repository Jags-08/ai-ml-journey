# NeuroWell – AI Personal Health Intelligence System

## Overview

A full-stack AI-powered personal health platform with interactive dashboards, smart pattern detection, voice input, AI chat assistant, and weekly report generation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild
- **Frontend**: React + Vite (Tailwind, Recharts, Framer Motion)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Auth**: Replit Auth (OIDC with PKCE)

## Features

1. **Smart Pattern Detection Engine** — detects burnout, dehydration, low mood, recurring symptoms
2. **Interactive Health Dashboard** — charts for sleep, water, activity, mood, stress, energy with Recharts
3. **Voice-Based Input** — Web Speech API for hands-free health logging
4. **AI Report Generator** — weekly health summary with score, highlights, suggestions
5. **AI Chat Assistant** — streaming GPT-5.2 health intelligence chat
6. **Secure Login System** — Replit Auth OIDC
7. **Mobile-Friendly UI** — responsive design, PWA-ready

## Structure

```text
artifacts/
├── api-server/         # Express backend API
│   └── src/routes/
│       ├── auth.ts         # OIDC login/callback/logout
│       ├── health.ts       # Healthcheck
│       ├── healthData.ts   # Health entries, analytics, reports
│       └── openai/         # AI chat conversations
├── neurowell/          # React+Vite frontend
│   └── src/
│       ├── pages/          # Landing, Dashboard, LogHealth, AiAssistant, History, Report
│       ├── components/     # Navigation, StatCard, HealthRing
│       └── hooks/          # use-voice-input, use-ai-chat-stream
lib/
├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
├── db/                 # Drizzle ORM schema + DB connection
│   └── src/schema/
│       ├── auth.ts             # User sessions
│       ├── conversations.ts    # AI chat conversations
│       ├── messages.ts         # AI chat messages
│       └── healthEntries.ts    # Health log entries
├── integrations-openai-ai-server/  # OpenAI server client
├── integrations-openai-ai-react/   # OpenAI React hooks
└── replit-auth-web/    # Replit Auth browser hook (useAuth)
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auth/user | Get current user |
| GET | /api/login | Start OIDC login |
| GET | /api/callback | OIDC callback |
| GET | /api/logout | Logout |
| GET | /api/health-entries | List health entries |
| POST | /api/health-entries | Create health entry |
| DELETE | /api/health-entries/:id | Delete entry |
| GET | /api/health-analytics | Pattern analysis + alerts |
| POST | /api/health-report | Generate weekly report |
| GET | /api/openai/conversations | List AI conversations |
| POST | /api/openai/conversations | Create conversation |
| GET | /api/openai/conversations/:id | Get conversation + messages |
| DELETE | /api/openai/conversations/:id | Delete conversation |
| POST | /api/openai/conversations/:id/messages | Send message (SSE stream) |

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm --filter @workspace/neurowell run dev` — Start frontend
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API types
- `pnpm --filter @workspace/db run push` — Push DB schema
