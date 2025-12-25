import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useTheme } from "next-themes";

interface ExcalidrawWrapperProps {
  setExcalidrawAPI: (data: ExcalidrawImperativeAPI) => void;
  onDiagramChange: (data: string) => void;
}

const ExcalidrawWrapper = ({
  onDiagramChange,
  setExcalidrawAPI,
}: ExcalidrawWrapperProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <div className="w-full h-full bg-white">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={(elements, appState) => {
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
        }}
        initialData={{
          elements: [],
          appState: {
            theme: resolvedTheme === "dark" ? "dark" : "light",
          },
        }}
        UIOptions={{
          dockedSidebarBreakpoint: 768,
        }}
      />
    </div>
  );
};

export default ExcalidrawWrapper;
