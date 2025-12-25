import { useCallback, useState } from "react";
import WelcomeFlow from "./main/welcome-flow";
import ExcalidrawWrapper from "./main/excalidraw-wrapper";
import CanvasHeader from "./main/canvas-header";
import ChatSidebar from "./main/chat-sidebar";

import { useGeminiChat } from "@/hooks/use-gemini-chat";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

interface AppContainerProps {
  apiKey: string;
  onLogout: () => void;
}

export default function AppContainer({ apiKey, onLogout }: AppContainerProps) {
  const [projectSetup, setProjectSetup] = useState<string>("");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [diagramData, setDiagramData] = useState<string>("");

  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  const getLatestDiagramData = useCallback(async () => {
    if (!excalidrawAPI) {
      return null;
    }
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    return {
      elements,
      appState: {
        theme: appState.theme,
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        viewBackgroundColor: appState.viewBackgroundColor,
      },
    };
  }, [excalidrawAPI]);

  const handleApplyModifications = useCallback(
    async (modifications: {
      elements: ExcalidrawElement[];
      appState: AppState;
    }) => {
      if (!excalidrawAPI) {
        console.error("[excaligenius] Excalidraw API not available");
        return;
      }
      console.log(
        "[excaligenius] Applying tool modifications to diagram",
        modifications
      );

      try {
        // Update elements
        if (modifications.elements) {
          excalidrawAPI.updateScene({
            elements: modifications.elements,
          });
        }

        // Update app state
        if (modifications.appState) {
          excalidrawAPI.updateScene({
            appState: {
              zoom: modifications.appState.zoom || { value: 1 },
              scrollX: modifications.appState.scrollX || 0,
              scrollY: modifications.appState.scrollY || 0,
            },
          });
        }
      } catch (error) {
        console.error(
          "[excaligenius] Error applying tool modifications:",
          error
        );
      }
    },
    [excalidrawAPI]
  );

  const { messages, loading, hasEvaluated, startEvaluation, sendMessage } =
    useGeminiChat({
      projectDescription: projectSetup,
      apiKey,
      getLatestDiagramData,
      handleApplyModifications,
    });

  if (projectSetup) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <ChatSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          projectDescription={projectSetup}
          messages={messages}
          loading={loading}
          hasEvaluated={hasEvaluated}
          onSendMessage={sendMessage}
          onLogout={onLogout}
        />

        <div className="flex-1 flex flex-col">
          <CanvasHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            loading={loading}
            hasDiagram={!!diagramData}
            onEvaluate={startEvaluation}
          />

          <div className="flex-1 overflow-hidden">
            <ExcalidrawWrapper
              setExcalidrawAPI={setExcalidrawAPI}
              onDiagramChange={setDiagramData}
            />
          </div>
        </div>
      </div>
    );
  }

  return <WelcomeFlow onProjectSetup={setProjectSetup} />;
}
