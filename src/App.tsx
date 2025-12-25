import { useState, lazy, Suspense, useEffect } from "react";
import "./App.css";
import ApiKeySetup from "./components/main/api-key-setup";
import { Loader2 } from "lucide-react";

// Lazy load the main app container
const AppContainer = lazy(() => import("./components/main/app-container"));

function App() {
  const key = localStorage.getItem("gemini_api_key");
  const [apiKey, setApiKey] = useState<string | null>(key || null);

  if (!apiKey) {
    return <ApiKeySetup onApiKeySubmit={setApiKey} />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading App...</p>
          </div>
        </div>
      }
    >
      <AppContainer apiKey={apiKey} onLogout={() => setApiKey(null)} />
    </Suspense>
  );
}

export default App;
