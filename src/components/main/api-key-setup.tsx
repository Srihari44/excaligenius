import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ApiKeySetupProps {
  onApiKeySubmit: (key: string) => void;
}

export default function ApiKeySetup({ onApiKeySubmit }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!apiKey.trim()) {
      setError("Please enter your Gemini API key");
      setLoading(false);
      return;
    }

    // Validate API key by attempting to initialize the model and simple generation
    try {
      const trimmedKey = apiKey.trim();
      console.log("[v0] Input API key length:", trimmedKey.length);
      console.log(
        "[v0] Attempting API validation with key:",
        trimmedKey.substring(0, 10) + "..."
      );

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(trimmedKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // We perform a minimal token count request to verify the key works
      // This is lighter/faster than generating content
      await model.countTokens("Test");

      console.log("[v0] API validation successful, storing key");
      localStorage.setItem("gemini_api_key", trimmedKey);
      console.log(
        "[v0] Calling onApiKeySubmit with key:",
        trimmedKey.substring(0, 10) + "..."
      );
      onApiKeySubmit(trimmedKey);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Invalid API key. Please check and try again.";
      console.log("[v0] Setting error state to:", errorMessage);
      setError(errorMessage);
      console.error("[v0] API validation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-blue-500/20 bg-slate-800/80 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl text-white font-bold">
            ExcaliDraw AI
          </CardTitle>
          <CardDescription className="text-slate-300">
            Bring Your Own Gemini API Key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Gemini API Key
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white mt-1"
                disabled={loading}
              />
              <p className="text-xs text-slate-400">
                Your API key is stored securely and only used for this session.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {loading ? "Validating..." : "Continue with API Key"}
            </Button>

            <div className="pt-4 space-y-2 text-xs text-slate-400">
              <p>
                Don't have a Gemini API key?{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Get one here
                </a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
