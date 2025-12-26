import type { Content } from "@google/generative-ai";

export interface ChatMessageType {
  id: string;
  role: "user" | "assistant";
  content: string;
  raw_history?: Content[];
  timestamp: Date;
}
