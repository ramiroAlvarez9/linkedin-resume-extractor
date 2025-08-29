# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Development Commands

- **Development server**: `bun dev` - Starts hot-reload server at http://localhost:3000
- **Production server**: `bun start` - Runs server in production mode
- **Build for production**: `bun run build` - Creates optimized build in `dist/` directory
- **Install dependencies**: `bun install`

The build script (`build.ts`) supports various options:
- `--outdir <path>` - Output directory (default: "dist")
- `--minify` - Enable minification
- `--sourcemap <type>` - Sourcemap type: none|linked|inline|external
- `--target <target>` - Build target: browser|bun|node
- Use `bun run build.ts --help` for full options

## Architecture

This is a full-stack React application using Bun's built-in server and bundler:

**Server (`src/index.tsx`)**:
- Uses `Bun.serve()` with route-based API endpoints
- Serves static React app for unmatched routes (`/*`)
- API routes under `/api/` namespace
- Hot module reloading enabled in development

**Frontend**:
- Preact with TypeScript (not React)
- Use `import { useState } from "preact/hooks"` instead of `import { useState } from "react"`
- Use `import { render } from "preact"` for rendering
- Entry point: `src/frontend.tsx` (loaded by `src/index.html`)
- Main component: `src/App.tsx`
- Uses Tailwind CSS v4 for styling via `bun-plugin-tailwind`

**Build System**:
- Bun's built-in bundler with HTML file processing
- Tailwind CSS plugin automatically configured
- TypeScript compilation with strict mode enabled
- Path aliases: `@/*` maps to `./src/*`

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import { render } from "preact";
import App from "./App";

// import .css files directly and it works
import './index.css';

function start() {
  render(<App />, document.getElementById("root")!);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

# LinkedIn PDF Extraction → API System

## Stack
- **Runtime:** Bun + TypeScript
- **PDF Processing:** pdf-ts
- **Database:** Supabase (free PostgreSQL)
- **Deploy:** Railway/Vercel

## Flow
1. `POST /upload` - PDF → extract data → JSON → Supabase
2. `GET /profiles` - public API from Supabase  
3. Simple frontend for upload

## Database Schema
Normalized tables: `profiles`, `experiences`, `education`, `skills`, `languages` (with UUIDs and relations)

