import "./index.css";
import { useState, useRef, type StateUpdater, type Dispatch } from "preact/hooks";
import type { CV } from "./schemas/cv";
import { CVSchema } from "./schemas/cv";
import * as v from "valibot";
import HarvardCV from "./components/harvardCv";
import { downloadDocx } from "./utils/docxGenerator";

const HELP_TEXT =
  "Drop or select your LinkedIn PDF resume, let the extractor parse the structured data, and preview it in the Harvard CV layout before downloading the DOCX template.";
const HELP_STEPS = [
  "Export your LinkedIn profile as a PDF resume from LinkedIn.",
  "Use the Upload tab to drag the file or click the drop zone and select it manually.",
  "Wait for the server to parse the file, then inspect the parsed data or jump to the Harvard CV tab.",
  "When you are ready, click the download button to save the Harvard CV-themed DOCX.",
];

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeDialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "data" | "harvard-cv">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [cvData, setCvData] = useState<CV | null>(() => {
    const storedCv = localStorage.getItem("parsedCv");
    if (!storedCv) {
      return null;
    } else {
      const parsedCv = JSON.parse(storedCv);
      return v.parse(CVSchema, parsedCv);
    }
  });

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
      saveCvData(response, setCvData, setUploadStatus, setActiveTab);
    } catch (error) {
      console.error(error);
      setUploadStatus("Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files[0] && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDownloadDocx = async () => {
    if (!cvData) return;
    try {
      await downloadDocx(cvData, `${cvData.name.replace(/\s+/g, "_")}_Harvard_CV.docx`);
    } catch (error) {
      console.error("Error generating DOCX:", error);
    }
  };

  const openNativeModal = () => {
    if (!nativeDialogRef.current?.open) {
      nativeDialogRef.current?.showModal();
    }
  };

  const closeNativeModal = () => {
    if (nativeDialogRef.current?.open) {
      nativeDialogRef.current.close();
    }
  };

  return (
    <div className="w-screen min-h-screen bg-gray-800 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <button
            onClick={openNativeModal}
            className="cursor-pointer border border-emerald-500 text-emerald-300 px-4 py-2 rounded hover:bg-emerald-500/10 transition-colors"
          >
            How it works
          </button>
        </div>
        <h1 className="p-8 text-3xl font-bold mb-8 text-center">Linkedin Portfolio Data Extractor</h1>
        <div className="flex mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("upload")}
            className={`cursor-pointer px-6 py-3 font-medium transition-colors ${activeTab === "upload" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-white"
              }`}
          >
            Upload PDF
          </button>
          <button
            onClick={() => setActiveTab("harvard-cv")}
            className={`cursor-pointer px-6 py-3 font-medium transition-all duration-200 rounded-t-lg ${activeTab === "harvard-cv"
              ? "border-b-2 border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-gray-700/50 hover:shadow-md"
              }`}
          >
            🎓 Harvard CV
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

        {activeTab === "harvard-cv" && (
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="flex justify-center items-center p-4">
              <button
                onClick={handleDownloadDocx}
                disabled={!cvData}
                className="cursor-pointer px-4 py-2 bg-emerald-600 lg:hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md lg:hover:shadow-lg lg:hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                📥 Download .docx
              </button>
            </div>
            <div className="flex justify-center">
              <div className="bg-white shadow-lg w-full max-w-full p-0">
                {cvData ? (
                  <HarvardCV cvData={cvData} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 p-8">
                    <p>No data available yet. Upload a LinkedIn PDF to generate the Harvard CV.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <dialog
        ref={nativeDialogRef}
        className=" m-auto w-3/4 md:w-full max-w-2xl rounded-3xl border border-gray-700 bg-gray-900 p-10 text-white shadow-2xl"
        aria-modal="true"
      >
        <div className="p-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold">How the extractor works</h2>
          <button
            className="text-gray-400 hover:text-white"
            onClick={closeNativeModal}
            aria-label="Close native help dialog"
          >
            ✕
          </button>
        </div>
        <p className="p-4 text-gray-300 mt-4">{HELP_TEXT}</p>
        <ol className="p-4 mt-4 list-decimal list-inside space-y-3 text-gray-200">
          {HELP_STEPS.map((step, index) => (
            <li key={`native-${index}`}>{step}</li>
          ))}
        </ol>
        <div className="p-4 mt-6 flex justify-end">
          <button
            className="rounded-full bg-emerald-500 px-6 py-2 font-semibold text-black hover:bg-emerald-400 transition-colors"
            onClick={closeNativeModal}
          >
            Got it
          </button>
        </div>
      </dialog>
    </div >
  );
}

export default App;

const saveCvData = async (
  response: Response,
  setCvData: Dispatch<StateUpdater<CV | null>>,
  setUploadStatus: Dispatch<StateUpdater<string>>,
  setActiveTab: Dispatch<StateUpdater<"data" | "upload" | "harvard-cv">>,
) => {
  const payload = await response.json();
  if (response.ok) {
    localStorage.setItem("parsedCv", JSON.stringify(payload.data));
    setCvData(payload.data);
    console.log("CV data saved to localStorage:", payload.data);

    setUploadStatus("PDF processed successfully!");
    setActiveTab("data");
  } else {
    setUploadStatus(payload.error || "Error processing PDF");
  }
};
