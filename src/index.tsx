import { serve } from "bun";
import homepage from "./index.html";
import { pdfToText } from "pdf-ts";
import * as v from "valibot";
import { generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { CVSchema } from "./schemas/cv";

function isLinkedInResume(text: string): boolean {
  const lowerText = text.toLowerCase();
  return lowerText.includes("linkedin.com/in/");
}

function getResumeLanguage(data: string) {
  const SPANISH_WORDS = ["contactar", "extracto", "experiencia", "educación"];
  const ENGLISH_WORDS = ["contact", "summary", "experience", "education"];

  const isSpanish = SPANISH_WORDS.every((word) => data.toLowerCase().includes(word));
  const isEnglish = ENGLISH_WORDS.every((word) => data.toLowerCase().includes(word));

  if (isSpanish) {
    return "ES";
  } else if (isEnglish) {
    return "EN";
  } else {
    return "No language detected";
  }
}

async function formatResumeData(data: string) {
  const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  });

  const dataLanguage = getResumeLanguage(data);
  const cleanData = data.replace(/Page\s+\d+\s+of\s+\d+/gi, "").replace(/\n\s*\n\s*\n/g, "\n");

  if (dataLanguage === "ES") {
    const headerSection = cleanData.substring(0, cleanData.indexOf("Extracto")).trim();
    const summarySection = cleanData.substring(cleanData.indexOf("Extracto"), cleanData.indexOf("Experiencia")).trim();
    const experienceSection = cleanData
      .substring(cleanData.indexOf("Experiencia"), cleanData.indexOf("Educación"))
      .trim();
    const educationSection = cleanData
      .substring(cleanData.indexOf("Educación"), cleanData.indexOf("Aptitudes principales"))
      .trim();
    const skillsSection = cleanData.substring(cleanData.indexOf("Aptitudes principales")).trim();

    const contactInfo = headerSection.substring(headerSection.indexOf("Contactar")).trim();

    const schemaDescription = `
    Required JSON Schema:
    {
      "contact": {
        "github": "string (GitHub profile URL)",
        "mobile": "string (phone number)", 
        "email": "string (valid email)",
        "linkedin": "string (LinkedIn profile URL)"
      },
      "name": "string (full name)",
      "title": "string (professional title/headline)",
      "location": "string (current location)",
      "summary": "string (professional summary)",
      "skills": {
        "mainSkills": ["array of main technical skills"],
        "languages": [{"name": "language", "level": "proficiency level"}]
      },
      "experience": [{
        "company": "string",
        "position": "string", 
        "startDate": "string (format: YYYY-MM or similar)",
        "endDate": "string (format: YYYY-MM or 'Present')",
        "duration": "string (e.g., '2 años 3 meses')",
        "location": "string",
        "achievements": ["array of key achievements"],
        "technologies": ["array of technologies used (optional)"]
      }],
      "education": [{
        "institution": "string",
        "degree": "string",
        "field": "string", 
        "period": "string (time period)"
      }]
    }`;

    try {
      const { text } = await generateText({
        model: deepseek("deepseek-chat"),
        prompt: `Extract and structure information from this Spanish LinkedIn resume into the exact JSON format specified.

          RESUME SECTIONS:
          Header/Contact: ${headerSection}
          Contact Info: ${contactInfo}
          Summary: ${summarySection}
          Experience: ${experienceSection}
          Education: ${educationSection}
          Skills: ${skillsSection}

          ${schemaDescription}

          Instructions:
          - Extract ALL information accurately from the provided sections
          - Return ONLY valid JSON matching the schema exactly
          - Use proper Spanish-to-English translations for field names where appropriate
          - If a field is missing, use empty string "" or empty array [] as appropriate
          - Ensure email format is valid
          - Format dates consistently

          JSON Response:`,
      });

      let cleanedText = text.trim();

      // Remove markdown code blocks if present
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsedData = JSON.parse(cleanedText);
      const validatedCv = v.parse(CVSchema, parsedData);

      return validatedCv;
    } catch (error) {
      console.error("AI processing error:", error);
      throw error;
    }
  } else if (dataLanguage === "EN") {
    const headerSection = cleanData.substring(0, cleanData.indexOf("Summary")).trim();
    const summarySection = cleanData.substring(cleanData.indexOf("Summary"), cleanData.indexOf("Experience")).trim();
    const experienceSection = cleanData
      .substring(cleanData.indexOf("Experience"), cleanData.indexOf("Education"))
      .trim();
    const educationSection = cleanData.substring(cleanData.indexOf("Education"), cleanData.indexOf("Skills")).trim();
    const skillsSection = cleanData.substring(cleanData.indexOf("Skills")).trim();

    const contactInfo = headerSection.substring(headerSection.indexOf("Contact")).trim();

    const schemaDescription = `
    Required JSON Schema:
    {
      "contact": {
        "github": "string (GitHub profile URL)",
        "mobile": "string (phone number)", 
        "email": "string (valid email)",
        "linkedin": "string (LinkedIn profile URL)"
      },
      "name": "string (full name)",
      "title": "string (professional title/headline)",
      "location": "string (current location)",
      "summary": "string (professional summary)",
      "skills": {
        "mainSkills": ["array of main technical skills"],
        "languages": [{"name": "language", "level": "proficiency level"}]
      },
      "experience": [{
        "company": "string",
        "position": "string", 
        "startDate": "string (format: YYYY-MM or similar)",
        "endDate": "string (format: YYYY-MM or 'Present')",
        "duration": "string (e.g., '2 years 3 months')",
        "location": "string",
        "achievements": ["array of key achievements"],
        "technologies": ["array of technologies used (optional)"]
      }],
      "education": [{
        "institution": "string",
        "degree": "string",
        "field": "string", 
        "period": "string (time period)"
      }]
    }`;

    try {
      const { text } = await generateText({
        model: deepseek("deepseek-chat"),
        prompt: `Extract and structure information from this English LinkedIn resume into the exact JSON format specified.

          RESUME SECTIONS:
          Header/Contact: ${headerSection}
          Contact Info: ${contactInfo}
          Summary: ${summarySection}
          Experience: ${experienceSection}
          Education: ${educationSection}
          Skills: ${skillsSection}

          ${schemaDescription}

          Instructions:
          - Extract ALL information accurately from the provided sections
          - Return ONLY valid JSON matching the schema exactly
          - If a field is missing, use empty string "" or empty array [] as appropriate
          - Ensure email format is valid
          - Format dates consistently

          JSON Response:`,
      });

      console.log("response", text);

      let cleanedText = text.trim();

      // Remove markdown code blocks if present
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsedData = JSON.parse(cleanedText);
      const validatedCv = v.parse(CVSchema, parsedData);

      return validatedCv;
    } catch (error) {
      console.error("AI processing error:", error);
      throw error;
    }
  } else {
    throw new Error("No language detected - cannot format data");
  }
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

          const formattedData = await formatResumeData(text);

          return Response.json({
            success: true,
            data: formattedData,
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
