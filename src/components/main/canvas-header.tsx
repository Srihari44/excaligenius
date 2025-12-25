import { Button } from "@/components/ui/button";

import { Menu, Zap } from "lucide-react";

interface CanvasHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  loading: boolean;
  hasDiagram: boolean;
  onEvaluate: () => void;
}

export default function CanvasHeader({
  sidebarOpen,
  onToggleSidebar,
  loading,
  hasDiagram,
  onEvaluate,
}: CanvasHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-300 hover:text-white"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <Menu size={20} />
        </Button>
        <h1 className="text-xl font-bold text-white">Canvas</h1>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onEvaluate}
          disabled={loading || !hasDiagram}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Zap size={16} />
          {loading ? "Evaluating..." : "Evaluate Diagram"}
        </Button>
      </div>
    </div>
  );
}
