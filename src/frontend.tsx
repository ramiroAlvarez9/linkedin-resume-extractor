/**
 * This file is the entry point for the Preact app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

// Add Buffer polyfill for docx library browser compatibility
import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

import { render } from "preact";
import App from "./App";

function start() {
  render(<App />, document.getElementById("root")!);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
