import { useState } from "react";
import "./App.css";
import ApiKeySetup from "./components/api-key-setup";
import AppContainer from "./components/app-container";

function App() {
  const key = localStorage.getItem("gemini_api_key");
  const [apiKey, setApiKey] = useState<string | null>(key);

  if (!apiKey) {
    return <ApiKeySetup onApiKeySubmit={setApiKey} />;
  }
  return <AppContainer apiKey={apiKey} onLogout={() => setApiKey(null)} />;
}

export default App;
