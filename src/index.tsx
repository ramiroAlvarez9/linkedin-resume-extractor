import { serve } from "bun";
import homepage from "./index.html";
import { pdfToText } from "pdf-ts";

function isLinkedInResume(text: string): boolean {
  const lowerText = text.toLowerCase();
  return lowerText.includes("linkedin.com/in/");
}

function parseLinkedInPDF(text: string) {
  const profile = {
    name: "",
    title: "",
    location: "",
    summary: "",
    experience: [] as any[],
    education: [] as any[],
    skills: [] as string[],
  };

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line && !profile.name && line.length > 2 && !line.includes("@") && !line.includes("http")) {
      profile.name = line;
    }
  }

  return profile;
}

const server = serve({
  port: 3000,
  routes: {
    "/*": homepage,

    "/api/upload": {
      async POST(req) {
        try {
          const formData = await req.formData();
          const pdfFile = formData.get("pdf") as File;
          if (!pdfFile) {
            return Response.json({ error: "No PDF file provided" }, { status: 400 });
          }

          const pdfBuffer = await pdfFile.arrayBuffer();
          const text = await pdfToText(new Uint8Array(pdfBuffer));

          if (!isLinkedInResume(text)) {
            return Response.json({ error: "Not a LinkedIn resume" }, { status: 400 });
          }
          const extractedData = parseLinkedInPDF(text);

          return Response.json({
            success: true,
            data: extractedData,
            rawText: text,
          });
        } catch (error) {
          console.error("PDF processing error:", error);
          return Response.json({ error: "Failed to process PDF" }, { status: 500 });
        }
      },
    },
  },
  development: {
    // Enable browser hot reloading in development
    hmr: true,
    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
