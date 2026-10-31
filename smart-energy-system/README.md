# Smart Energy Saving Reminder System

**Course:** CHE110-CA1  
**Build:** Responsive React + TypeScript web app, local-first mode with optional Supabase schema  
**Status:** Demonstration-ready source; local functionality is enabled by default.

## Features

- Overview dashboard with monthly and 7-day rollups, configurable cost estimates, goal progress and upcoming in-app reminders.
- Consumption tracker with date, kWh, category and notes; edit and delete records; responsive charts; demo records visibly separated from user-entered readings.
- Electricity bill estimate using flat-rate or configurable progressive slab rates, fixed charges and additional charges. Slab values are examples, not official tariff rates.
- Reminder CRUD, due dates/times, categories, recurrence, completed/open filters and browser-local persistence.
- Rule-based tips based on the categories of user-entered readings. No personalised saving amount is asserted.
- Reduction goals with a declared baseline month and safe handling of zero/missing baselines.
- Optional CO₂e estimate only after configuring a factor and source URL; no default Indian grid factor is presented as verified.
- Learning centre with practical advice and a three-question knowledge check.
- Academic information page with exact assignment attribution, theme toggle, JSON data backup/restore, and clear local data controls.

## Academic credits

**Smart Energy Saving Reminder System**  
**Course:** CHE110-CA1

| Student name | UID | Section/Roll No. |
| --- | --- | --- |
| Ujjawal Priyadarshi | 12629952 | RK4P26HBA10 |
| Harsh Raj | 12629955 | RK4P26HBA13 |
| Vivek Raj | 12630001 | RK4P26HBA33 |

These details were transcribed from the supplied assignment-topic document. No faculty, institution approval, submission date or result claims were invented.

## Requirements

- Node.js 22 recommended (the `netlify.toml` build uses Node 22).
- npm.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. By default the app uses browser `localStorage`; no backend or credentials are needed.

## Verify and build

```bash
npm test
npm run build
npm run preview
```

## Data storage and browser reminders

Records, reminders, goal and settings are saved to this browser's `localStorage`. They are not shared across devices and clearing site data may remove them; use Settings & data → Export backup to keep a JSON copy. Sample readings are labelled as demonstration data. Use the reset function carefully.

The notification feature requests browser permission only. This app does **not** schedule guaranteed operating-system notifications after it is closed; due reminders are reliable as an in-app list when opened. Browser notifications are supported only where the browser allows them, generally on a secure origin.

## Optional Supabase setup

A Supabase project was not provisioned as part of this source build. The supplied migration is a starting schema with row-level security on user-owned rows; it is not wired into the UI for cloud sync yet.

1. Create a Supabase project that you control.
2. Apply `supabase/migrations/202610220001_energy_records_and_reminders.sql` in its SQL editor or with your migration workflow.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Before enabling cloud sync, implement and test sign-up/sign-in, session handling, and mapping between authenticated `auth.uid()` and all inserted records. Keep Row Level Security enabled. Never put a secret/service-role key in a browser bundle.
5. Check Supabase Security and Performance Advisors after applying schema changes.

The code deliberately does not imply that cloud sync works merely because credentials exist. The local-only app remains functional without them. The optional Supabase client stub currently detects configuration only; the UI is intentionally local-first until an authenticated data workflow has been implemented and tested.

## Deploy to Netlify

This repository includes `netlify.toml` using `npm run build` and publishing `dist`. For a manual deploy, run:

```bash
npm install
npm run build
npx netlify deploy --dir=dist
```

Publish to production only after inspecting the preview:

```bash
npx netlify deploy --prod --dir=dist
```

For continuous deployment, push this directory to a repository and create a Netlify project linked to it. If you later enable Supabase authentication, set the public URL and publishable key in the Netlify project's environment configuration. Never set server-side service-role credentials as `VITE_*` variables.

## Project structure

```text
smart-energy-system/
├── index.html
├── package.json
├── netlify.toml
├── .env.example
├── src/
│   ├── main.tsx       # app UI and interactions
│   ├── logic.ts       # calculations, validators, demo data and persistence
│   ├── supabase.ts    # optional client configuration only
│   ├── styles.css     # responsive design system and theme
│   └── types.ts       # data types
├── tests/
│   └── logic.test.ts
└── supabase/migrations/
    └── 202610220001_energy_records_and_reminders.sql
```

## Known limitations

- No live meter or utility-provider integration.
- No Supabase database project created or connected; migration is included for a later authenticated integration.
- Reminder delivery is local/in-app; no background scheduler or push-notification service exists.
- Carbon estimation requires a user-sourced factor. Do not report it as measured emissions.
- Goal comparison uses records currently in the app, which may not cover a full calendar month.
- The initial bill form opens with clearly editable example inputs; users should replace these with their tariff and consumption.

## Verification notes for this build environment

- `node tests/runtime-smoke.mjs`: passed (10 package-free arithmetic, validation-edge and attribution assertions).
- `tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --strict --skipLibCheck src/logic.ts src/types.ts`: passed for the calculation/type modules.
- Project manifest JSON and ZIP integrity: passed.
- Full `npm test` / `npm run build`: not executed successfully in this environment because the npm registry could not be reached (`EAI_AGAIN`), so required packages were not installed. The React UI, Recharts rendering and full TypeScript compilation need to be verified after `npm install` in a network-enabled environment.
- Live responsive-browser rendering and console inspection: not run; browser automation tooling was present but its expected bundled Chromium binary was absent. The supplied CSS includes mobile breakpoints and reduced-motion support, but that is not a substitute for visual QA.
