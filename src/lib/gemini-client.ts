export interface GeminiMessage {
  role?: "user" | "model";
  parts: Array<{
    text: string;
  }>;
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
  system_instruction?: GeminiMessage;
}

export async function* streamGeminiResponse(
  prompt: string,
  diagramData: string,
  projectDescription: string,
  conversationHistory: GeminiMessage[],
  apiKey: string,
  isFollowUp = false
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = `You are an expert AI diagram reviewer and architect. You help users design, review, and improve their diagrams and system architectures.

When reviewing diagrams, provide:
1. Clear feedback on the design
2. Suggestions for improvement
3. Potential issues or edge cases
4. Best practices recommendations

If the user asks you to modify the diagram, respond with a JSON object in this format:
\`\`\`json
{
  "feedback": "Your text feedback here...",
  "modifications": {
    "elements": [...excalidraw elements...],
    "appState": {...}
  }
}
\`\`\`

For regular responses, just provide text feedback.`;

  const userMessage: GeminiMessage = {
    role: "user",
    parts: [
      {
        text: isFollowUp
          ? prompt
          : `Project: ${projectDescription}\n\nPlease review this diagram and provide feedback:\n\nDiagram Data:\n${diagramData}\n\nUser's Request: ${prompt}`,
      },
    ],
  };

  const messages = isFollowUp
    ? [...conversationHistory, userMessage]
    : [userMessage];

  const request: GeminiRequest = {
    system_instruction: {
      parts: [
        {
          text: systemPrompt,
        },
      ],
    },
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`;

  try {
    console.log("[v0] Starting Gemini stream request");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[v0] Gemini API error:", error);
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              console.log("[v0] Received chunk:", chunk.substring(0, 50));
              yield chunk;
            }
          } catch (e) {
            console.error("[v0] Failed to parse chunk:", e);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      const data = buffer.slice(6);
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) {
            console.log("[v0] Final chunk:", chunk.substring(0, 50));
            yield chunk;
          }
        } catch (e) {
          console.error("[v0] Failed to parse final chunk:", e);
        }
      }
    }
  } catch (error) {
    console.error("[v0] Stream error:", error);
    throw error;
  }
}

export function tryParseModifications(text: string): any | null {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (e) {
    console.error("[v0] Failed to parse modifications:", e);
  }
  return null;
}
