import { useState, useEffect, useCallback } from "react";
import { streamGeminiResponse } from "@/lib/gemini-client";

import type { ChatMessageType } from "@/lib/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  Ordered,
} from "@excalidraw/excalidraw/element/types";
import type { Content } from "@google/generative-ai";

interface UseGeminiChatProps {
  projectDescription: string;
  apiKey: string;
  tools: {
    getDiagramData: () => Promise<{
      elements: readonly Ordered<NonDeletedExcalidrawElement>[];
      appState: Partial<AppState>;
    } | null>;
    applyModifications: (modifications: {
      elements: ExcalidrawElement[];
      appState: AppState;
    }) => Promise<void>;
  };
}

export function useGeminiChat({
  projectDescription,
  apiKey,
  tools,
}: UseGeminiChatProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);

  // Add initial context message on first load or when project description changes
  useEffect(() => {
    // Reset state when project description changes (optional, but good practice for new projects)
    if (projectDescription) {
      setHasEvaluated(false);

      const initialMessage: ChatMessageType = {
        id: "initial",
        role: "assistant",
        content: `Hi! I'm your AI diagram review assistant. I've noted that you want to build:\n\n"${projectDescription}"\n\nGo ahead and create your diagram in Excalidraw, then click the "Evaluate Diagram" button to get my feedback!`,
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  }, [projectDescription]);

  const getConversationHistory = useCallback((): Content[] => {
    // Find the last message with raw_history
    let lastHistoryMsgIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].raw_history) {
        lastHistoryMsgIndex = i;
        break;
      }
    }

    let baseHistory: Content[] = [];
    let startIndex = 0;

    if (lastHistoryMsgIndex !== -1) {
      baseHistory = messages[lastHistoryMsgIndex].raw_history!;
      startIndex = lastHistoryMsgIndex + 1;
    }

    // Append subsequent messages
    const subsequentMessages = messages
      .slice(startIndex)
      .filter((m) => m.id !== "initial");
    const newContent = subsequentMessages.map(
      (msg) =>
        ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        } as Content)
    );

    return [...baseHistory, ...newContent];
  }, [messages]);

  const handleStreamResponse = async (prompt: string, isFollowUp: boolean) => {
    setLoading(true);

    try {
      console.log(
        `[excaligenius] Starting ${
          isFollowUp ? "follow-up" : "evaluation"
        } stream`
      );
      const assistantMessageId = (Date.now() + 1).toString();
      let fullContent = "";

      const placeholderMessage: ChatMessageType = {
        id: assistantMessageId,
        role: "assistant", // "model" in API
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, placeholderMessage]);

      const generator = streamGeminiResponse({
        prompt,
        projectDescription,
        conversationHistory: getConversationHistory(),
        apiKey,
        tools,
        isFollowUp,
      });

      for await (const chunk of generator) {
        if (typeof chunk === "string") {
          fullContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        } else if (
          chunk &&
          typeof chunk === "object" &&
          chunk.type === "complete"
        ) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, raw_history: chunk.history }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error("[excaligenius] Chat/Evaluation error:", error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content:
          error instanceof Error && error.message.includes("API error")
            ? "API Error: Please check your API key and try again."
            : "Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const startEvaluation = async () => {
    const diagramData = await tools.getDiagramData();
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

    setHasEvaluated(true);

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: "Please evaluate my diagram and provide feedback.",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // We pass the prompt directly to handleStreamResponse
    await handleStreamResponse("Please evaluate my diagram", false);
  };

  const sendMessage = async (input: string) => {
    if (!input.trim() || loading || !hasEvaluated) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    await handleStreamResponse(input, true);
  };

  return {
    messages,
    loading,
    hasEvaluated,
    startEvaluation,
    sendMessage,
    setMessages,
  };
}
