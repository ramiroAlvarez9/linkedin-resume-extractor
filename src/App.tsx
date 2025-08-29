import "./index.css";
import { useState, useRef } from "preact/hooks";
import * as v from "valibot";

const RawDataSchema = v.pipe(v.string(), v.minLength(1));
type RawResume = v.InferOutput<typeof RawDataSchema>;

export function App() {
  const [activeTab, setActiveTab] = useState<"upload" | "data">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setUploadStatus("Please select a PDF file");
      return;
    }

    setIsLoading(true);
    setUploadStatus("");

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const rawResume = v.parse(RawDataSchema, result.rawText);
        formatResumeData(rawResume)
        setUploadStatus("PDF processed successfully!");
        setActiveTab("data");
      } else {
        const error = await response.json();
        setUploadStatus(error.error || "Error processing PDF");
      }
    } catch (error) {
      setUploadStatus("Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatResumeData = (data: RawResume) => {
    const dataLanguage = getResumeLanguage(data)

    if (dataLanguage === 'ES') {
      const contactarIndex = data.indexOf('Contactar');
      const extractoIndex = data.indexOf('Extracto');

      const contact = data.substring(contactarIndex, extractoIndex).trim()
      const headline = contact.split('\n').slice(-3).join('\n');

      console.log('Contact info:', contact);
      console.log('Headline:', headline);
    } else if (getResumeLanguage(data) === 'EN') {
      console.log('format to english')
    } else {
      console.log('no formating')
    }
  }


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
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "upload"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-gray-400 hover:text-white"
              }`}
          >
            Upload PDF
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === "data"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-gray-400 hover:text-white"
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
                {uploadStatus && (
                  <div className="mt-4 text-center">
                    <p className={uploadStatus.includes('Error') || uploadStatus.includes('failed') ? 'text-red-400' : 'text-green-400'}>
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

  const isSpanish = SPANISH_WORDS.every(word => data.toLowerCase().includes(word));
  const isEnglish = ENGLISH_WORDS.every(word => data.toLowerCase().includes(word));

  if (isSpanish) {
    return 'ES'
  } else if (isEnglish) {
    return 'EN'
  } else {
    return 'No language detected'
  }
}


//TODO: this can be replaced by a library
const SPANISH_WORDS = [
  "contactar",
  "extracto",
  "experiencia",
  "educación"
];

const ENGLISH_WORDS = [
  "contact",
  "summary",
  "experience",
  "education"
];
