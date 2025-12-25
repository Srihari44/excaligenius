import { useCallback, useRef, lazy, Suspense } from "react";

import { Loader2 } from "lucide-react";

import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

// Lazy load Excalidraw
const Excalidraw = lazy(async () => {
  await import("@excalidraw/excalidraw/index.css");
  return import("@excalidraw/excalidraw").then((module) => ({
    default: module.Excalidraw,
  }));
});

interface ExcalidrawWrapperProps {
  setExcalidrawAPI: (data: ExcalidrawImperativeAPI) => void;
  onDiagramChange: (data: string) => void;
}

const ExcalidrawWrapper = ({
  onDiagramChange,
  setExcalidrawAPI,
}: ExcalidrawWrapperProps) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOnChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const diagramData = JSON.stringify({
          elements,
          appState: {
            theme: appState.theme,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
        });
        onDiagramChange(diagramData);
      }, 500);
    },
    [onDiagramChange]
  );

  return (
    <div className="w-full h-full bg-white relative">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading Canvas...</p>
            </div>
          </div>
        }
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleOnChange}
          initialData={{
            elements: [],
            appState: {
              theme: "dark",
            },
          }}
          UIOptions={{
            dockedSidebarBreakpoint: 768,
          }}
        />
      </Suspense>
    </div>
  );
};

export default ExcalidrawWrapper;
