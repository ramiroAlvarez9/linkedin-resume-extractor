# Repository Guidelines

## Project Structure & Module Organization

The Bun entry point `src/index.tsx` bootstraps the Preact app defined in `App.tsx`. Shared UI pieces live in `src/components` (e.g., `harvardCv.tsx`). Assets such as icons and sample resumes live under `src/assets`, while schema validation sits in `src/schemas` and document helpers in `src/utils` (notably `docxGenerator.ts`). HTML scaffolding and Tailwind setup live in `src/index.html` and `src/index.css`. Use feature-focused folders and keep parsing logic close to `schemas` to simplify validation updates.

## Build, Test, and Development Commands

- `bun install` installs dependencies defined in `package.json`.
- `bun run dev` starts the hot-reloading preview via `bun --hot src/index.tsx`.
- `bun run start` runs the production bundle with `NODE_ENV=production`.
- `bun run build` executes `build.ts`; run it before packaging or deploying.
- `bun run format:check` / `bun run format` enforce Prettier formatting.

## Coding Style & Naming Conventions

Write modern TypeScript with Preact hooks. Components and schema types use `PascalCase`, utility functions use `camelCase`, and files stick to kebab- or lower-case (`harvardCv.tsx`, `docxGenerator.ts`). Prefer 2-space indentation, double quotes, and early returns for guard clauses. Tailwind classes should group layout → color → state modifiers for readability. Run Prettier before pushing; no manual reflowing of generated HTML.

## Testing Guidelines

No automated suite ships yet, but new logic must include Bun tests (e.g., `bun test src/utils/docxGenerator.test.ts`). Name files `*.test.ts` next to the code they exercise. Stub browser APIs with `@testing-library/preact` when touching UI, and validate schemas with realistic LinkedIn JSON blobs. Target meaningful coverage for parsing and document generation—those areas break user exports fastest.

## Commit & Pull Request Guidelines

Follow the conventional prefix seen in history (`feat:`, `fix:`, etc.), scope succinctly, and describe the user-facing change. PRs should link issues or task IDs, include screenshots/GIFs for UI updates, list manual test steps (`bun run dev`, sample PDF upload, DOCX download), and mention any schema or dependency changes. Ensure CI-ready by running `bun run build` and `bun run format:check` locally.

## Security & Data Handling

LinkedIn resumes contain PII. Never commit sample PDFs or generated DOCX files—keep them in local scratch folders or `.gitignored` paths. Always clear uploaded data from `localStorage` during debugging and avoid logging raw CV details to the console or network traces.
