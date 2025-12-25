import { useState } from "react";
import "./App.css";
import ApiKeySetup from "./components/main/api-key-setup";
import AppContainer from "./components/main/app-container";

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  if (!apiKey) {
    return <ApiKeySetup onApiKeySubmit={setApiKey} />;
  }

  return <AppContainer apiKey={apiKey} onLogout={() => setApiKey(null)} />;
}

export default App;
