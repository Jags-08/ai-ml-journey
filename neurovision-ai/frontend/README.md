# 🧠 NeuroVision v4

> AI that understands your images. Real pixel intelligence.

## Architecture

```
src/
├── core/           Brain — state, API, config, logger, error handler
│   └── env/        Dev vs prod config split
├── system/         Intelligence layer — orchestrator, action/decision/context engines, feature gate
├── services/       Service layer — image, AI, storage, network
├── modules/        Business logic — upload, analysis, editing, session
├── components/     UI — canvas, panels, chat, command palette, onboarding
├── pages/          Entry points — AppPage (wires everything), LandingPage
├── hooks/          Reusable state logic — useImage, useAnalysis, useChat, useNetwork
├── constants/      All magic values — actions, goals, limits
├── types/          JSDoc type definitions
├── utils/          Helpers, analytics, performance
└── styles/         CSS variables + global styles
```

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:3000
npm run build      # production build
npm test           # run unit tests
```

## Key Design Principles

- **No magic numbers** — everything in `constants/`
- **No raw fetch** — all API calls through `core/api.js`
- **No DOM in business logic** — modules call services, components handle DOM
- **Offline-first** — rule-based analysis works without any API
- **Feature-gated** — all pro features check `canUse()` before executing
- **Observable state** — `subscribe(key, cb)` for reactive UI updates
