# bun-react-tailwind-template

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Local AI hardware requirements

If you follow the guidance in this repository to run the resume extraction pipeline fully inside the browser, the model can run on devices without a dedicated GPU. The in-browser runtimes discussed (e.g. `onnxruntime-web`, `WebLLM`, or `transformers.js`) automatically fall back to WebAssembly or WebGPU-on-CPU execution. On machines without GPU acceleration the experience will simply be slower: model downloads take the same time, but inference may last several seconds to minutes depending on the CPU. To keep the UI responsive, execute the model inside a Web Worker and display progress indicators so users know the local analysis is still running.
