# Apertura pública: IA gratuita y rate limiting por IP

Este documento resume el estado actual, los riesgos y un plan concreto para abrir la app al público sin quemar créditos de IA ni sobrecargar el servicio.

## Estado actual
- Backend: Bun con endpoint `POST /api/upload` en `src/index.tsx`.
- IA: DeepSeek vía Vercel AI SDK (`generateText` + `@ai-sdk/deepseek`).
- Validación: solo acepta PDFs con rastro de LinkedIn (`linkedin.com/in/`).
- Límite: no existe rate limiting ni persistencia. `.env` ya incluye variables Mongo, pero no hay código que las use.
- Riesgo: un uso abierto puede agotar créditos y saturar el servidor.

## Objetivos
- Ofrecer una ruta de uso gratuito/limitado para usuarios anónimos.
- Restringir abusos por IP y proteger recursos de IA.
- Mantener la calidad del parseo y UX razonable.

## Estrategia

### 1) IA de uso gratuito / bajo costo
Opciones compatibles entre sí (seleccionables por env):
- Ollama (local): costo cero externo si se auto‑hostea. Requiere CPU/RAM y modelos locales (p.ej. `llama3.1:8b-instruct`). Ideal para self‑hosting.
- Groq (OpenAI‑compatible): free tier generoso; requiere clave y puede cambiar políticas. Útil para demo pública.
- BYOK (Bring Your Own Key): el usuario pega su propia API key (DeepSeek u otra). Nuestro servidor no gasta créditos; usar gratis solo si no hay key del usuario.

Selección en runtime:
- Si el request trae API key de usuario → usar BYOK.
- Si no, usar el proveedor “free” configurado vía `FREE_AI_PROVIDER` (`ollama` | `groq` | `deepseek`).
- Si no hay proveedor disponible → 503 con mensaje claro.

### 2) Rate limiting persistente por IP con MongoDB
- Colección `rate_limits` con forma `{ ip, uploadCount, createdAt, updatedAt, resetAt? }`.
- Operación atómica: `findOneAndUpdate` con `{ upsert: true }`, `$inc: { uploadCount: 1 }`, `$setOnInsert` y `$set` para timestamps.
- Umbral configurable: `FREE_PLAN_MAX_UPLOADS` (p.ej., 3). Al superar, responder 429.
- Índices en startup:
  - Único en `ip` (`ip_unique`).
  - TTL opcional en `resetAt` (`ttl_resetAt`, `expireAfterSeconds: 0`, filtro parcial por tipo fecha) para ventanas de reseteo.
- Falla segura: si la DB falla, negar (mejor bloquear abuso que quemar créditos).

### 3) Protecciones adicionales (recomendadas)
- CAPTCHA (Cloudflare Turnstile) en el upload para frenar bots.
- Límite de tamaño/páginas del PDF (p.ej., <= 5MB, <= 20 páginas).
- Concurrencia por IP = 1 (cola en memoria) para evitar floods simultáneos.
- Cache por hash de PDF (evita pagar dos veces por el mismo archivo en corto plazo).
- Reducción/normalización de texto para acotar tokens.

## Cambios concretos en el repo

### Variables de entorno (añadir a `.env.example`)
- `FREE_PLAN_MAX_UPLOADS=3`
- `FREE_AI_PROVIDER=ollama|groq|deepseek`
- `GROQ_API_KEY=` (si se usa Groq)
- `OLLAMA_HOST=http://127.0.0.1:11434` (si se usa Ollama)

### Dependencias
- `mongodb@^6` (rate limiting persistente)
- Opcionales para free tier:
  - `@ai-sdk/ollama` (Ollama)
  - `@ai-sdk/openai` (para Groq vía `baseURL` compatible OpenAI)

### Nuevo util: `src/utils/database.ts`
Incluye:
- `getMongoClient`, `connectMongo`, `closeMongo` (singleton reusado en hot reloads).
- `getDb`, `getRateLimitsCollection`.
- `ensureRateLimitIndexes()`.
- `checkQuota(ip): Promise<{ allowed: boolean; remaining: number }>`.

### Integración en `src/index.tsx`
- En el arranque del servidor: `ensureRateLimitIndexes()`.
- En `POST /api/upload` (al comienzo):
  - Obtener IP desde `x-forwarded-for`/`x-real-ip`/`req.headers` con fallback.
  - `checkQuota(ip)` → si no permitido, responder 429.
- Selector de modelo:
  - Si viene API key del usuario (header/body), usar BYOK.
  - Si no, usar el proveedor “free” seleccionado en `FREE_AI_PROVIDER`.
- Endurecer entrada:
  - Rechazar PDFs grandes (`413`) y PDFs sin traza de LinkedIn.

## Trade‑offs
- Ollama: cero gasto externo, exige más recursos del servidor. Excelente para self‑hosting.
- Groq: práctico para demo pública; depende de free tier de un tercero.
- BYOK: elimina costo propio, requiere UI y manejo cuidadoso de keys (no persistir, no loggear).
- IP‑based: no perfecto tras NAT/VPN; mitigar con CAPTCHA y TTL/ventanas.

## QA / Verificación
1) `FREE_PLAN_MAX_UPLOADS=2` en `.env`.
2) Subir el mismo PDF 2 veces desde la misma IP → OK; 3ra → 429.
3) Reiniciar servidor → contadores persisten.
4) Simular error de Mongo → uploads denegados (fail‑closed).

## Futuras mejoras
- Ventanas rodantes: setear `resetAt` al primer uso y usar TTL para cleanup.
- No contar intentos denegados (pre‑check antes del `$inc` si se quiere cambiar la semántica).
- Cache persistente (Redis) para resultados repetidos.
- Métricas y alertas (p.ej., logs agregados por rango de IP y ratios de denegación).

## Decisiones abiertas
- Proveedor “free” por defecto: `ollama` (self‑host) o `groq` (remoto). Alternativamente, activar BYOK desde el inicio.
- Cupo por IP: sugerido `3`.
- Aplicar CAPTCHA ahora o en una segunda iteración.

## Notas operacionales
- Reusar un único `MongoClient` en todo el proceso; el driver maneja pooling.
- Evitar loggear PII; almacenar solo IP y contadores.
- TLS en dev: si hay errores con Atlas SRV en Bun, permitir `MONGODB_TLS_INSECURE=true` solo en desarrollo.
- Tiempo de selección de servidor Mongo configurable con `MONGODB_SERVER_SELECTION_TIMEOUT_MS`.

---

Si se aprueba este plan, el siguiente paso es implementar: (1) util de Mongo y rate limiting, (2) selector de modelo con proveedor “free” + BYOK opcional, y (3) límites de tamaño de PDF. 
