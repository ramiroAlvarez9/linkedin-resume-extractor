# Guía: Integrar Qwen2.5 (0.5B / 1.5B) en el navegador con Transformers.js + ONNX Runtime Web

Esta guía explica cómo reemplazar el flujo actual de `/api/upload` para ejecutar todo el pipeline de parseo y extracción directamente en el navegador usando los modelos **Qwen2.5-0.5B-Instruct** y **Qwen2.5-1.5B-Instruct**. Los pasos asumen que el proyecto sigue usando Bun como servidor estático para `frontend.tsx` y que la UI principal vive en `src/App.tsx`.

> **Objetivo**: leer el PDF localmente, invocar Qwen en el cliente vía Transformers.js (backend `onnxruntime-web`) y poblar `cvData` sin depender de DeepSeek ni de un backend remoto.

## 1. Requisitos previos

- Node/Bun >= 1.1 (ya presente en el proyecto).
- Navegador con soporte WebAssembly SIMD. Para acelerar la versión de 1.5B se recomienda WebGPU, pero `onnxruntime-web` cae a WebAssembly si no está disponible.
- Espacio en disco para los pesos ONNX (~1.2 GB la versión 1.5B FP16).
- `python>=3.10` y `pipx` o `pip` para convertir los checkpoints oficiales a ONNX.

## 2. Dependencias a instalar

```bash
bun add @xenova/transformers@^3 onnxruntime-web@^1.19
```

> Transformers.js 3.x usa `onnxruntime-web` como backend y descarga automáticamente los archivos `.wasm`. No se requiere empaquetar `onnxruntime-web` manualmente salvo que se desee modo offline (ver sección 5).

## 3. Preparación de los modelos ONNX

1. Clonar los repositorios oficiales desde Hugging Face:
   ```bash
   git lfs install
   git clone https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct
   git clone https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct
   ```

2. Exportar a ONNX con `optimum-cli` (instalar si no existe: `pip install optimum[exporters] onnx`):
   ```bash
   optimum-cli export onnx --model Qwen/Qwen2.5-0.5B-Instruct ./onnx/qwen2.5-0.5b --task text-generation --trust-remote-code
   optimum-cli export onnx --model Qwen/Qwen2.5-1.5B-Instruct ./onnx/qwen2.5-1.5b --task text-generation --trust-remote-code
   ```

   - Genera archivos `model.onnx`, `config.json`, `tokenizer.json`, `tokenizer_config.json`, `generation_config.json`.
   - Para reducir tamaño se puede añadir `--fp16` (requiere WebGPU) o `--quantize int8` (mayor compatibilidad CPU, ligera pérdida de calidad).

3. Copiar la carpeta resultante a `public/models/` dentro del repo:
   ```bash
   mkdir -p public/models/qwen2.5-0.5b public/models/qwen2.5-1.5b
   cp -R ./onnx/qwen2.5-0.5b/* public/models/qwen2.5-0.5b/
   cp -R ./onnx/qwen2.5-1.5b/* public/models/qwen2.5-1.5b/
   ```

4. Opcional: comprimir con `brotli` o `gzip` y configurar `bunfig.toml` para servir archivos comprimidos.

## 4. Worker dedicado para Qwen

Crear `src/workers/qwen.worker.ts` para aislar la carga del modelo y mantener el hilo principal responsivo.

```ts
// src/workers/qwen.worker.ts
import { env, AutoTokenizer, AutoModelForCausalLM, TextStreamer } from "@xenova/transformers";

env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency ?? 4;
env.backends.onnx.wasm.proxy = true; // delega a worker secundario propio de ORT

export type InferenceMessage = {
  type: "run";
  modelSize: "0.5b" | "1.5b";
  prompt: string;
};

const MODEL_MAP = {
  "0.5b": {
    model: "/models/qwen2.5-0.5b",
  },
  "1.5b": {
    model: "/models/qwen2.5-1.5b",
  },
} as const;

let cache = new Map<string, Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>>>();
let tokenizerCache = new Map<string, Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>>();

self.onmessage = async (event: MessageEvent<InferenceMessage>) => {
  const { type, modelSize, prompt } = event.data;
  if (type !== "run") return;

  const { model: modelId } = MODEL_MAP[modelSize];

  const tokenizer = tokenizerCache.get(modelId) ?? (await AutoTokenizer.from_pretrained(modelId));
  tokenizerCache.set(modelId, tokenizer);

  const model = cache.get(modelId) ?? (await AutoModelForCausalLM.from_pretrained(modelId, {
    dtype: "fp16",
    device: "webgpu",
    fallback_to_cpu: true,
    progress_callback: (data) => {
      (self as DedicatedWorkerGlobalScope).postMessage({ type: "progress", ...data });
    },
  }));
  cache.set(modelId, model);

  const generator = await model.generate(
    tokenizer,
    prompt,
    {
      max_new_tokens: 800,
      temperature: 0.1,
      repetition_penalty: 1.05,
      streamer: new TextStreamer({
        on_text_generated: (text) => {
          (self as DedicatedWorkerGlobalScope).postMessage({ type: "stream", text });
        },
      }),
    },
  );

  const text = generator.output_text;
  (self as DedicatedWorkerGlobalScope).postMessage({ type: "done", text });
};
```

- `device: "webgpu"` activa aceleración si está disponible; `fallback_to_cpu: true` garantiza soporte en máquinas sin GPU.
- Ajustar `dtype` a `"fp32"` si se exportó el modelo en precisión completa.

## 5. Carga offline de ONNX Runtime

Para evitar descargas dinámicas de los `*.wasm` en producción, copiar los binarios que expone Transformers.js:

```bash
cp node_modules/@xenova/transformers/dist/*.wasm public/models/runtime/
```

Luego establecer:

```ts
env.backends.onnx.wasm.wasmPaths = "/models/runtime";
```

en el worker antes de instanciar el modelo.

## 6. Adaptar el frontend

1. Crear un helper `src/utils/local-qwen.ts` que abstraiga la llamada al worker:

   ```ts
   const worker = new Worker(new URL("../workers/qwen.worker", import.meta.url), { type: "module" });

   export async function runQwen(prompt: string, size: "0.5b" | "1.5b") {
     return new Promise<string>((resolve, reject) => {
       const chunks: string[] = [];

       const handleMessage = (event: MessageEvent<any>) => {
         if (event.data.type === "stream") {
           chunks.push(event.data.text);
         } else if (event.data.type === "done") {
           worker.removeEventListener("message", handleMessage);
           resolve(chunks.join("") || event.data.text);
         } else if (event.data.type === "error") {
           worker.removeEventListener("message", handleMessage);
           reject(event.data.error);
         }
       };

       worker.addEventListener("message", handleMessage);
       worker.postMessage({ type: "run", modelSize: size, prompt });
     });
   }
   ```

2. Exportar `getResumeLanguage`, `formatResumeSections` y el prompt JSON desde el backend (`src/index.tsx`) hacia un archivo compartido (`src/utils/resume.ts`) para reutilizarlos en el cliente.

3. En `App.tsx`, reemplazar la llamada a `fetch("/api/upload")` por:

   ```ts
   import { parsePdfToText } from "../utils/pdf-client"; // usar pdfjs-dist
   import { buildPromptFromSections, sanitizeJson } from "../utils/resume";
   import { runQwen } from "../utils/local-qwen";

   const handleFileUpload = async (file: File) => {
     // ... validaciones previas ...
     const rawText = await parsePdfToText(file);
     const { prompt, expectedSchema } = buildPromptFromSections(rawText);

     const completion = await runQwen(prompt, userPrefersSmallModel ? "0.5b" : "1.5b");
     const json = sanitizeJson(completion);
     const validated = v.parse(CVSchema, JSON.parse(json));

     saveCvData(validated, setCvData, setUploadStatus, setActiveTab);
   };
   ```

4. Actualizar el estado para mostrar progreso:
   - `isLoadingModel` (carga inicial del worker/ONNX).
   - `progress` con porcentajes emitidos desde el worker.
   - Mensajes alternativos si el navegador no soporta WebAssembly SIMD (mostrar fallback al endpoint actual).

## 7. Selección dinámica del tamaño del modelo

- **0.5B**: recomendado por defecto; pesa ~300 MB FP16, responde en ~8‑15 s en CPU moderna.
- **1.5B**: usar cuando `navigator.gpu` esté disponible y `navigator.deviceMemory >= 12` (GB).

Ejemplo de heurística:

```ts
const supportsWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
const deviceMemory = (navigator as any).deviceMemory ?? 4;
const defaultModelSize = supportsWebGPU && deviceMemory >= 12 ? "1.5b" : "0.5b";
```

Permitir al usuario seleccionar manualmente el modelo desde la UI (toggle en la pantalla de upload) y persistir en `localStorage`.

## 8. Validación y pruebas

1. Ejecutar `bunx playwright test` (si existe) o `bun run lint` para asegurar que el nuevo código compila.
2. Probar manualmente en:
   - Chrome/Edge con WebGPU.
   - Firefox (solo WebAssembly, confirmar rendimiento aceptable).
   - Dispositivo sin GPU dedicada (verificar tiempos de inferencia y feedback UI).
3. Medir consumo de memoria con DevTools (`Performance → Memory`) y ajustar `max_new_tokens`.

## 9. Mantenimiento

- Actualizar los pesos cuando Hugging Face publique nuevas versiones (repetir exportación).
- Limpiar `cache` del worker en un botón de la UI para liberar memoria (`cache.clear()` y `self.gc?.()` si el navegador lo soporta).
- Documentar en el README que el procesamiento ocurre localmente y que la carga inicial puede tardar.

---

Con estos pasos tendrás un pipeline local basado en Qwen2.5 que respeta la arquitectura actual del proyecto, mantiene compatibilidad con usuarios sin GPU (gracias a `fallback_to_cpu`) y se integra con `Transformers.js` y `onnxruntime-web`.
