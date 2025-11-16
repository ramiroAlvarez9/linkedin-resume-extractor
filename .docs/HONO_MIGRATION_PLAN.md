# Hono Migration Plan

This document outlines the steps to migrate the backend of this project from a raw `Bun.serve` implementation to the Hono web framework. This change is necessary to enable deployment on serverless platforms like Vercel.

The migration will not affect the frontend code or the build process.

---

### 1. Add Hono Dependency

The first step is to add `hono` to the project's dependencies. This can be done with the following command:

```bash
bun add hono
```

---

### 2. Refactor the Backend (`src/index.tsx`)

The core of the migration is to refactor `src/index.tsx` to use Hono for routing and request handling instead of the `Bun.serve` object.

**Key Changes:**

-   **Initialization**: Instead of `serve`, we will initialize a `Hono` app.
-   **Routing**: The `routes` object will be replaced with Hono's route methods (`app.post(...)`, `app.get(...)`).
-   **Context**: Request and response handling will use Hono's context object (`c`). For example, `c.req.formData()` to get form data and `c.json({...})` to return a JSON response.
-   **Export**: The file will no longer call `Bun.serve` at the end. Instead, it will `export default app`. This allows Vercel to pick up the Hono instance.

**Example of the new structure:**

```typescript
import { Hono } from 'hono'
// All your other imports and helper functions remain the same

const app = new Hono()

// Define API routes using Hono's methods
app.post('/api/upload', async (c) => {
  // The logic from the original POST handler goes here.
  // Use `c.req` for the request and `c.json()` for the response.
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown';
  // ... rest of the logic
  return c.json({ success: true, data: formattedData });
})

app.get('/api/ip-limiter-table', async (c) => {
  // Logic for this endpoint...
  return c.json({ data });
})

// ... other routes

export default app
```

---

### 3. Frontend Serving

The current `Bun.serve` configuration also serves the static frontend files. In a Vercel deployment, this is handled differently. The `vercel.json` file will tell Vercel where the static files are. The Hono app will only be responsible for the `/api` routes.

---

### 4. Update `vercel.json`

The `vercel.json` file will be simplified. We will remove the `builds` section that was causing the error and adjust the routes to correctly handle the Hono API and the static frontend.

**New `vercel.json`:**

```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/src/index.tsx"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/index.html"
    }
  ]
}
```
It's also possible that with Hono, Vercel's zero-configuration deployment might work without a `vercel.json` file at all.

---

By following this plan, the project will be aligned with Vercel's deployment model, making the process smooth and reliable.
