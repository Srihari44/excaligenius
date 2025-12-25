export interface ChatMessageType {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export interface ExcalidrawElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  [key: string]: any
}

export interface DiagramData {
  elements: ExcalidrawElement[]
  appState: {
    theme: "light" | "dark"
    zoom: { value: number }
    scrollX: number
    scrollY: number
  }
}

export interface GeminiMessage {
  role: "user" | "model"
  parts: Array<{
    text: string
  }>
}
