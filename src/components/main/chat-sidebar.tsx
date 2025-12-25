import { useState, useRef, useEffect } from "react";
import ChatMessage from "./chat-message";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Send, LogOut } from "lucide-react";

import type { ChatMessageType } from "@/lib/types";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectDescription: string;
  messages: ChatMessageType[];
  loading: boolean;
  hasEvaluated: boolean;
  onSendMessage: (input: string) => void;
  onLogout: () => void;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  projectDescription,
  messages,
  loading,
  hasEvaluated,
  onSendMessage,
  onLogout,
}: ChatSidebarProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !hasEvaluated) return;

    onSendMessage(input);
    setInput("");
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Chat Sidebar */}
      <div
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 fixed lg:static left-0 top-0 h-screen w-120 bg-slate-900 border-r border-slate-700 flex flex-col z-30`}
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
        <ScrollArea className="h-[calc(100%-210px)] px-4 py-2 w-full">
          <div className="space-y-2">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
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
    </>
  );
}
