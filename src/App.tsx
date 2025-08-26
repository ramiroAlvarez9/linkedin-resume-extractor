import "./index.css";
import { useState } from "preact/hooks";

export function App() {
  const [activeTab, setActiveTab] = useState<"upload" | "data">("upload");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="border min-h-screen bg-gray-900 text-white p-6">
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
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-lg font-medium mb-2">Choose PDF File</p>
                <p className="text-gray-400">Upload your LinkedIn PDF resume to extract data</p>
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
