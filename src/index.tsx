import { serve } from "bun";
import homepage from "./index.html";
import { pdfToText } from "pdf-ts";
import * as v from "valibot";
import { generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { CVSchema } from "./schemas/cv";

let MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

  const date = new Date();
  const currentYear = date.getFullYear();
  let currentMonth = MONTHS[date.getMonth()];
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
        "startDate": "string (Month Year)",
        "endDate": "string (Month Year)",
        "duration": "string",
        "location": "string",
        "description": ["description of tasks in the company (optional, can be empty.)"],
      }],
      "education": [{
        "institution": "string",
        "degree": "string",
        "field": "string", 
        "period": "string (e.g Month Year - Month Year)"
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
        "startDate": "string (Month Year)",
        "endDate": "string (Month Year)",
        "duration": "string",
        "location": "string",
        "description": ["description of tasks in the company (optional, can be empty.)"],
      }],
      "education": [{
        "institution": "string",
        "degree": "string",
        "field": "string", 
        "period": "string (e.g Month Year - Month Year)"
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

async function getSupabaseClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase not configured");
  }

  return createClient(url, key);
}

export async function getTimesUsed(ip: string): Promise<number | null> {
  try {
    const supabase = await getSupabaseClient();
    const table = "iplimiter";

    const { data, error } = await supabase.from(table).select("times_used").eq("ip", ip).single();

    if (error) {
      if (error.code === "PGRST116") {
        return 0;
      }
      console.error("Error getting times used:", error);
      return null;
    }

    return data ? data.times_used : 0;
  } catch (error) {
    console.error("Error in getTimesUsed:", error);
    return null;
  }
}

async function incrementTimesUsed(ip: string): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const table = "iplimiter";

    const { data: existing, error: selectError } = await supabase
      .from(table)
      .select("id, times_used")
      .eq("ip", ip)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error selecting IP for increment:", selectError);
      return;
    }

    if (existing) {
      const newTimesUsed = existing.times_used + 1;
      const { error: updateError } = await supabase
        .from(table)
        .update({ times_used: newTimesUsed })
        .eq("id", existing.id);

      updateError
        ? console.error("Error updating times_used:", updateError)
        : console.log(`IP ${ip} usage incremented to ${newTimesUsed}`);
    } else {
      const { error: insertError } = await supabase.from(table).insert({ ip: ip, times_used: 1 });

      insertError
        ? console.error("Error inserting new IP:", insertError)
        : console.log(`IP ${ip} added with 1 use.`);
    }
  } catch (error) {
    console.error("Error in incrementTimesUsed:", error);
  }
}


const server = serve({
  port: 3000,
  routes: {
    "/api/upload": {
      async POST(req) {

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
        const timesUsed = await getTimesUsed(ip)

        if (timesUsed && timesUsed > 3) return Response.json({ error: "Too many request" }, { status: 429 });

        try {
          const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
          await incrementTimesUsed(ip);

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
    "/api/ip-limiter-table": {
      async GET() {
        try {
          const supabase = await getSupabaseClient();
          const table = "iplimiter";

          const { data, error } = await supabase.from(table).select("*");

          if (error) {
            return Response.json({ error: error.message }, { status: 500 });
          }

          return Response.json({ data });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          return Response.json({ error: "Failed to get ip-limiter-table", details: errorMessage }, { status: 500 });
        }
      },

      async POST(req) {
        try {
          const supabase = await getSupabaseClient();
          const table = "iplimiter";
          const body = await req.json();

          const { data, error } = await supabase.from(table).insert(body).select();

          if (error) {
            return Response.json({ error: error.message }, { status: 500 });
          }

          return Response.json({ data });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          return Response.json({ error: "Failed to post to ip-limiter-table", details: errorMessage }, { status: 500 });
        }
      },
    },
    "/*": homepage,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
