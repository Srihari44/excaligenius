import {
  GoogleGenerativeAI,
  type Content,
  SchemaType,
} from "@google/generative-ai";
import type { GeminiMessage } from "./types";

export async function* streamGeminiResponse(
  prompt: string,
  projectDescription: string,
  conversationHistory: GeminiMessage[],
  apiKey: string,
  getDiagramData: () => Promise<any>,
  applyModifications: (modifications: any) => Promise<void>,
  isFollowUp = false
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = `You are an expert AI diagram reviewer and architect. You help users design, review, and improve their diagrams and system architectures.

Current Project:
${projectDescription}

You have access to two tools:
1. "get_excalidraw_data": Retrieves the current Excalidraw diagram data (elements and app state).
   - ALWAYS call this tool first if you need to see the diagram to provide feedback or modifications.
   - If the user's request doesn't require looking at the diagram, you can skip calling it.

2. "apply_excalidraw_modifications": Applies changes to the Excalidraw diagram.
   - Use this tool IMMEDIATELY when you want to modify the diagram (e.g., "Add a database node", "Change color to blue").
   - Do NOT ask for confirmation before calling this tool if the user explicitly requested a change.
   - Pass the full 'elements' array and 'appState' object as needed.

When reviewing diagrams, provide:
1. Clear feedback on the design
2. Suggestions for improvement
3. Potential issues or edge cases
4. Best practices recommendations

For regular responses, just provide text feedback.`;

  const getExcalidrawConfig = {
    name: "get_excalidraw_data",
    description:
      "Retrieves the current Excalidraw diagram data elements and app state",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  };

  const applyExcalidrawModificationsConfig = {
    name: "apply_excalidraw_modifications",
    description:
      "Applies modifications to the Excalidraw diagram (elements and app state).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        elements: {
          type: SchemaType.ARRAY,
          description: "List of Excalidraw elements to update or add.",
          items: { type: SchemaType.OBJECT, properties: {} },
        },
        appState: {
          type: SchemaType.OBJECT,
          description: "App state properties to update",
          properties: {},
        },
      },
      required: ["elements"],
    },
  };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Assuming 2.0-flash is what was intended or upgrading to it
      systemInstruction: systemPrompt,
      tools: [
        {
          functionDeclarations: [
            getExcalidrawConfig,
            applyExcalidrawModificationsConfig,
          ],
        },
      ],
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

    console.log("[v0] Sending message to Gemini...");
    let result = await chat.sendMessageStream(prompt);

    // Process the stream and handle tool calls loop
    while (true) {
      let functionCallFound: any = null;

      for await (const chunk of result.stream) {
        const calls = chunk.functionCalls();
        if (calls && calls.length > 0) {
          functionCallFound = calls[0];
          break;
        }

        const text = chunk.text();
        if (text) yield text;
      }

      if (functionCallFound) {
        console.log(`[v0] Tool called: ${functionCallFound.name}`);

        if (functionCallFound.name === "get_excalidraw_data") {
          const diagramData = await getDiagramData();
          const functionResponse = {
            functionResponse: {
              name: "get_excalidraw_data",
              response: { data: diagramData },
            },
          };
          result = await chat.sendMessageStream([functionResponse]);
        } else if (
          functionCallFound.name === "apply_excalidraw_modifications"
        ) {
          const args = functionCallFound.args;
          await applyModifications(args);
          const functionResponse = {
            functionResponse: {
              name: "apply_excalidraw_modifications",
              response: { success: true },
            },
          };
          result = await chat.sendMessageStream([functionResponse]);
        } else {
          console.warn("[v0] Unknown tool called");
          break;
        }
      } else {
        // No function call found in the entire stream, we are done
        break;
      }
    }
  } catch (error) {
    console.error("[v0] Stream error:", error);
    throw error;
  }
}
