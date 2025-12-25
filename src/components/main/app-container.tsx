import { useState, lazy, Suspense } from "react";
import WelcomeFlow from "@/components/main/welcome-flow";
import { Loader2 } from "lucide-react";

const Editor = lazy(() => import("@/components/main/editor"));

interface AppContainerProps {
  apiKey: string;
  onLogout: () => void;
}

export default function AppContainer({ apiKey, onLogout }: AppContainerProps) {
  const [projectSetup, setProjectSetup] = useState<string | null>(null);

  if (projectSetup) {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading Editor...</p>
            </div>
          </div>
        }
      >
        <Editor
          projectDescription={projectSetup}
          apiKey={apiKey}
          onLogout={onLogout}
        />
      </Suspense>
    );
  }

  return <WelcomeFlow onProjectSetup={setProjectSetup} />;
}
