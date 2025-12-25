export interface ChatMessageType {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}
