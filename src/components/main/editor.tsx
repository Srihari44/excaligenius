import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Menu, LogOut, Zap, Check, X } from "lucide-react";
import ExcalidrawWrapper from "@/components/main/excalidraw-wrapper";
import ChatMessage from "@/components/main/chat-message";
import type { ChatMessageType, GeminiMessage } from "@/lib/types";
import {
  streamGeminiResponse,
  tryParseModifications,
} from "@/lib/gemini-client";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface EditorProps {
  projectDescription: string;
  apiKey: string;
  onLogout: () => void;
}

export default function Editor({
  projectDescription,
  apiKey,
  onLogout,
}: EditorProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [diagramData, setDiagramData] = useState<string>("");
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [diagramModifications, setDiagramModifications] = useState<any>(null);
  const [showModificationPreview, setShowModificationPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add initial context message on first load
  useEffect(() => {
    const initialMessage: ChatMessageType = {
      id: "initial",
      role: "assistant",
      content: `Hi! I'm your AI diagram review assistant. I've noted that you want to build:\n\n"${projectDescription}"\n\nGo ahead and create your diagram in Excalidraw, then click the "Evaluate Diagram" button to get my feedback!`,
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
  }, [projectDescription]);

  const getConversationHistory = useCallback((): GeminiMessage[] => {
    return messages
      .filter((m) => m.id !== "initial")
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));
  }, [messages]);

  const applyModifications = useCallback(async () => {
    if (!diagramModifications || !excalidrawAPI) {
      console.error("[v0] No modifications or excalidraw ref");
      return;
    }

    try {
      console.log("[v0] Applying modifications to diagram");

      if (!excalidrawAPI) {
        console.error("[v0] Excalidraw API not available");
        setShowModificationPreview(false);

        const msg: ChatMessageType = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "I can suggest changes, but please manually apply them or ask me to describe them in detail.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, msg]);
        return;
      }

      // Update elements
      if (diagramModifications.elements) {
        excalidrawAPI.updateScene({ elements: diagramModifications.elements });
      }

      // Update app state
      if (diagramModifications.appState) {
        excalidrawAPI.updateScene({
          appState: {
            zoom: diagramModifications.appState.zoom || { value: 1 },
            scrollX: diagramModifications.appState.scrollX || 0,
            scrollY: diagramModifications.appState.scrollY || 0,
          },
        });
      }

      setShowModificationPreview(false);
      setDiagramModifications(null);

      const successMsg: ChatMessageType = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "I've applied the suggested modifications to your diagram! Review them and let me know if you'd like any adjustments.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMsg]);
    } catch (error) {
      console.error("[v0] Error applying modifications:", error);

      const errorMsg: ChatMessageType = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "I encountered an error applying the modifications. The changes couldn't be automatically applied. Let me know if you'd like me to describe the changes instead.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }, [diagramModifications]);

  const handleEvaluate = async () => {
    if (!diagramData) {
      const errorMsg: ChatMessageType = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "Please create a diagram first before evaluating. Draw something in the canvas!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    setLoading(true);
    setHasEvaluated(true);

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: "Please evaluate my diagram and provide feedback.",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      console.log("[v0] Starting evaluation stream");
      const assistantMessageId = (Date.now() + 1).toString();
      let fullContent = "";

      const placeholderMessage: ChatMessageType = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, placeholderMessage]);

      const generator = streamGeminiResponse(
        "Please evaluate my diagram",
        diagramData,
        projectDescription,
        getConversationHistory(),
        apiKey,
        false
      );

      for await (const chunk of generator) {
        fullContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullContent }
              : msg
          )
        );
      }

      const modifications = tryParseModifications(fullContent);
      if (modifications?.modifications) {
        console.log("[v0] Diagram modifications detected");
        setDiagramModifications(modifications.modifications);
        setShowModificationPreview(true);
      }
    } catch (error) {
      console.error("[v0] Evaluation error:", error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content:
          error instanceof Error && error.message.includes("API error")
            ? "API Error: Please check your API key and try again."
            : "Sorry, there was an error evaluating your diagram. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !hasEvaluated) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      console.log("[v0] Starting follow-up message stream");
      const assistantMessageId = (Date.now() + 1).toString();
      let fullContent = "";

      const placeholderMessage: ChatMessageType = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, placeholderMessage]);

      const generator = streamGeminiResponse(
        input,
        diagramData,
        projectDescription,
        getConversationHistory(),
        apiKey,
        true
      );

      for await (const chunk of generator) {
        fullContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullContent }
              : msg
          )
        );
      }

      const modifications = tryParseModifications(fullContent);
      if (modifications?.modifications) {
        console.log("[v0] Diagram modifications detected in follow-up");
        setDiagramModifications(modifications.modifications);
        setShowModificationPreview(true);
      }
    } catch (error) {
      console.error("[v0] Chat error:", error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 fixed lg:static left-0 top-0 h-screen w-80 bg-slate-900 border-r border-slate-700 flex flex-col z-30`}
      >
        <div className="p-4 border-b border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Feedback</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 hover:bg-red-900/20"
            >
              <LogOut size={16} />
            </Button>
          </div>
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200">
            <p className="font-semibold mb-1">Project:</p>
            <p className="line-clamp-3">{projectDescription}</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[calc(100%-210px)] p-4">
          <div className="space-y-2">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-slate-700 space-y-2 bg-slate-950"
        >
          {!hasEvaluated && (
            <p className="text-xs text-slate-400 text-center">
              Evaluate your diagram first to start chatting
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                hasEvaluated
                  ? "Ask follow-up questions..."
                  : "Create & evaluate first"
              }
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
              disabled={loading || !hasEvaluated}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim() || !hasEvaluated}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Send size={16} />
            </Button>
          </div>
        </form>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-slate-300 hover:text-white"
            >
              <Menu size={20} />
            </Button>
            <h1 className="text-xl font-bold text-white">Canvas</h1>
          </div>
          <div className="flex gap-2">
            {showModificationPreview && diagramModifications && (
              <>
                <Button
                  onClick={applyModifications}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Check size={16} />
                  Apply Suggestions
                </Button>
                <Button
                  onClick={() => {
                    setShowModificationPreview(false);
                    setDiagramModifications(null);
                  }}
                  variant="outline"
                  className="text-slate-300 border-slate-600 hover:bg-slate-700"
                >
                  <X size={16} />
                </Button>
              </>
            )}
            <Button
              onClick={handleEvaluate}
              disabled={loading || !diagramData}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Zap size={16} />
              {loading ? "Evaluating..." : "Evaluate Diagram"}
            </Button>
          </div>
        </div>

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
