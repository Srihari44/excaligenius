import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

interface DiagramCanvasProps {
  onReady: (api: any) => void;
  onChange: (elements: readonly any[]) => void;
}

export function DiagramCanvas({ onReady, onChange }: DiagramCanvasProps) {
  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={onReady}
        onChange={onChange}
        theme="dark"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            clearCanvas: true,
          },
        }}
      />
    </div>
  );
}
