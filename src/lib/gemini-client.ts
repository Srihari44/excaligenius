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

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          try {
            const jsonObjects = extractJsonObjects(buffer);
            for (const parsed of jsonObjects) {
              const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) {
                console.log("[v0] Received chunk:", chunk);
                yield chunk;
              }
            }
          } catch (e) {
            console.error("[v0] Failed to parse final buffer:", e);
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Try to extract and parse complete JSON objects from buffer
      const jsonObjects = extractJsonObjects(buffer);

      if (jsonObjects.length > 0) {
        for (const parsed of jsonObjects) {
          const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) {
            console.log("[v0] Received chunk:", chunk);
            yield chunk;
          }
        }

        // Clear the buffer after successful parsing
        // Keep any incomplete JSON for next iteration
        const lastClosingBrace = buffer.lastIndexOf("}");
        if (lastClosingBrace !== -1) {
          buffer = buffer.slice(lastClosingBrace + 1);
        }
      }
    }
  } catch (error) {
    console.error("[v0] Stream error:", error);
    throw error;
  }
}

// Helper function to extract JSON objects from a string
function extractJsonObjects(str: string): any[] {
  const jsonObjects: any[] = [];

  // Remove array brackets and clean up
  let cleaned = str.trim();
  if (cleaned.startsWith("[")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.endsWith("]")) {
    cleaned = cleaned.slice(0, -1);
  }

  // Remove leading commas and whitespace
  cleaned = cleaned.replace(/^,\s*/, "").trim();

  let depth = 0;
  let currentObject = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    // Handle string escaping
    if (escapeNext) {
      currentObject += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      currentObject += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      currentObject += char;
      continue;
    }

    // Only track braces outside of strings
    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
      }
    }

    currentObject += char;

    // When depth returns to 0, we have a complete object
    if (!inString && depth === 0 && currentObject.trim()) {
      try {
        const trimmed = currentObject.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const parsed = JSON.parse(trimmed);
          jsonObjects.push(parsed);
        }
        currentObject = "";
      } catch {
        // If parsing fails, keep accumulating
        console.warn("[v0] Failed to parse object, continuing...");
      }
    }
  }

  return jsonObjects;
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
