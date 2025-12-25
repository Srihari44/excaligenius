import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import type { GeminiMessage } from "./types";

export async function* streamGeminiResponse(
  prompt: string,
  diagramData: string,
  projectDescription: string,
  conversationHistory: GeminiMessage[],
  apiKey: string,
  isFollowUp = false
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = `You are an expert AI diagram reviewer and architect. You help users design, review, and improve their diagrams and system architectures.

Current Project:
${projectDescription}

Current Diagram Data:
${diagramData}

When reviewing diagrams, provide:
1. Clear feedback on the design
2. Suggestions for improvement
3. Potential issues or edge cases
4. Best practices recommendations

If the user asks you to modify the diagram, respond with a JSON object with no comments and formatting in this structure:
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    // Convert history to SDK format
    const history: Content[] = conversationHistory.map((msg) => ({
      role: msg.role,
      parts: msg.parts.map((p) => ({ text: p.text })),
    }));

    const chat = model.startChat({
      history: isFollowUp ? history : [],
      generationConfig: {
        temperature: 0.7,
      },
    });

    const messageContent = prompt;

    console.log("[v0] Sending message to Gemini...");
    const result = await chat.sendMessageStream(messageContent);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      // console.log("[v0] Received chunk:", chunkText);
      yield chunkText;
    }
  } catch (error) {
    console.error("[v0] Stream error:", error);
    throw error;
  }
}

// Helper function to extract JSON objects from a string
// Note: SDK handles stream parsing, but we still use tryParseModifications for the final result
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
