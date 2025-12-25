import { Copy, Check } from "lucide-react";
import { useState, useMemo, memo } from "react";
import Markdown from "markdown-to-jsx/react";

import type { ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if message contains code blocks or structural content
  const hasCode = useMemo(
    () => message.content.includes("```"),
    [message.content]
  );
  const hasJson = useMemo(
    () => message.content.includes('"elements"'),
    [message.content]
  );

  return (
    <div
      className={`flex gap-2 mb-4 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {message.role === "assistant" && (
        <div className="w-6 h-6 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs text-white font-bold">
          AI
        </div>
      )}
      <div
        className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg group ${
          message.role === "user"
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-slate-700 text-slate-100 rounded-bl-none"
        }`}
      >
        <div className="text-sm prose prose-invert max-w-none break-words leading-relaxed">
          <Markdown>{message.content}</Markdown>
        </div>
        {message.role === "assistant" && !hasCode && !hasJson && (
          <button
            onClick={handleCopy}
            className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-600 rounded"
            title="Copy message"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-slate-300" />
            )}
          </button>
        )}
      </div>
      {message.role === "user" && (
        <div className="w-6 h-6 rounded-full bg-slate-600 flex-shrink-0 flex items-center justify-center text-xs text-white font-bold">
          U
        </div>
      )}
    </div>
  );
}

export default memo(ChatMessage);
