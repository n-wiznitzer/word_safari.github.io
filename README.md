# Word Safari — React migration starter

This is the initial React + TypeScript + Vite scaffold for the Word Safari migration.

## Important

- The existing working app is preserved at `legacy/index.html`.
- The new React app is only a migration shell; learning and authentication features have not yet been migrated.
- `vite.config.ts` uses `/word_safari.github.io/` as the GitHub Pages project-site base path.
- Before migrating authentication, replace the placeholder in `src/services/supabase.ts` with the publishable key from the current app. Do not put a Supabase `service_role` key in frontend code.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`. GitHub Pages deployment configuration will be added in a later step.
