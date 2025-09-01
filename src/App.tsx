import "./index.css";
import { useState, useRef } from "preact/hooks";
import * as v from "valibot";
import { generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { CVSchema } from "./schemas/cv";

const RawDataSchema = v.pipe(v.string(), v.minLength(1));
type RawResume = v.InferOutput<typeof RawDataSchema>;

export function App() {
  const [activeTab, setActiveTab] = useState<"upload" | "data">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes("pdf")) {
      setUploadStatus("Please select a PDF file");
      return;
    }

    setIsLoading(true);
    setUploadStatus("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const rawResume = v.parse(RawDataSchema, result.rawText);
        await formatResumeData(rawResume);
        setUploadStatus("PDF processed successfully!");
        setActiveTab("data");
      } else {
        const error = await response.json();
        setUploadStatus(error.error || "Error processing PDF");
      }
    } catch (error) {
      console.error(error);
      setUploadStatus("Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatResumeData = async (data: RawResume) => {
    const deepseek = createDeepSeek({
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    });

    const dataLanguage = getResumeLanguage(data);
    const cleanData = data.replace(/Page\s+\d+\s+of\s+\d+/gi, "").replace(/\n\s*\n\s*\n/g, "\n");

    if (dataLanguage === "ES") {
      const headerSection = cleanData.substring(0, cleanData.indexOf("Extracto")).trim();
      const summarySection = cleanData
        .substring(cleanData.indexOf("Extracto"), cleanData.indexOf("Experiencia"))
        .trim();
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
        const { text, usage } = await generateText({
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

        console.log("Token usage:", usage);

        // Parse and validate the response
        const parsedData = JSON.parse(text);
        const validatedData = v.parse(CVSchema, parsedData);

        // Save to localStorage
        localStorage.setItem("parsedCv", JSON.stringify(validatedData));
        console.log("CV data saved to localStorage:", validatedData);
      } catch (error) {
        console.error("AI processing error:", error);
      }
    } else if (dataLanguage === "EN") {
      // Extract structured sections from English resume
      const headerSection = cleanData.substring(0, cleanData.indexOf("Summary")).trim();
      const summarySection = cleanData.substring(cleanData.indexOf("Summary"), cleanData.indexOf("Experience")).trim();
      const experienceSection = cleanData
        .substring(cleanData.indexOf("Experience"), cleanData.indexOf("Education"))
        .trim();
      const educationSection = cleanData.substring(cleanData.indexOf("Education"), cleanData.indexOf("Skills")).trim();
      const skillsSection = cleanData.substring(cleanData.indexOf("Skills")).trim();

      const contactInfo = headerSection.substring(headerSection.indexOf("Contact")).trim();

      const deepseek = createDeepSeek({
        apiKey: process.env.DEEPSEEK_API_KEY ?? "",
      });

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
        const { text, usage } = await generateText({
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

        console.log("Token usage:", usage);

        // Parse and validate the response
        const parsedData = JSON.parse(text);
        const validatedData = v.parse(CVSchema, parsedData);

        // Save to localStorage
        localStorage.setItem("parsedCv", JSON.stringify(validatedData));
        console.log("CV data saved to localStorage:", validatedData);
      } catch (error) {
        console.error("AI processing error:", error);
      }
    } else {
      console.log("No language detected - cannot format data");
    }
  };

  const handleFileInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files[0] && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-800 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">LinkedIn Portfolio Data Extractor</h1>
        <div className="flex mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "upload" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-white"
              }`}
          >
            Upload PDF
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "data" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-white"
              }`}
          >
            View Data
          </button>
        </div>
        {activeTab === "upload" && (
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-6">Upload LinkedIn PDF Resume</h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-300">Processing...</p>
              </div>
            ) : (
              <div>
                <div
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                  onDrop={(e: DragEvent) => {
                    e.preventDefault();
                    const files = e.dataTransfer?.files;
                    if (files && files[0] && files.length > 0) {
                      handleFileUpload(files[0]);
                    }
                  }}
                  onDragOver={(e: DragEvent) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <div className="text-4xl mb-4">📄</div>
                  <p className="text-lg font-medium mb-2">Choose PDF File</p>
                  <p className="text-gray-400 mb-4">Drop your LinkedIn PDF resume here or click to select</p>
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInput} className="hidden" />
                </div>
                {uploadStatus && (
                  <div className="mt-4 text-center">
                    <p
                      className={
                        uploadStatus.includes("Error") || uploadStatus.includes("failed")
                          ? "text-red-400"
                          : "text-green-400"
                      }
                    >
                      {uploadStatus}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "data" && (
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-6">Extracted Data</h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-300">Loading data...</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>No data available yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

function getResumeLanguage(data: RawResume) {
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

//TODO: this can be replaced by a library
const SPANISH_WORDS = ["contactar", "extracto", "experiencia", "educación"];

const ENGLISH_WORDS = ["contact", "summary", "experience", "education"];
