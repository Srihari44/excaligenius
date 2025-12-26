import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
  type FunctionCall,
  type Part,
} from "@google/generative-ai";
import type { AppState } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  Ordered,
} from "@excalidraw/excalidraw/element/types";

export async function validateGeminiKey(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  return model.countTokens("Test");
}

type StreamGeminiResponseArgs = {
  prompt: string;
  projectDescription: string;
  conversationHistory: Content[];
  apiKey: string;
  tools: {
    getDiagramData: () => Promise<{
      elements: Readonly<Ordered<NonDeletedExcalidrawElement>[]>;
      appState: Readonly<Partial<AppState>>;
    } | null>;
    applyModifications: (modifications: {
      elements: ExcalidrawElement[];
      appState: AppState;
    }) => Promise<void>;
  };
  isFollowUp?: boolean;
};

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

export async function* streamGeminiResponse(
  args: StreamGeminiResponseArgs
): AsyncGenerator<
  string | { type: "complete"; history: Content[] },
  void,
  unknown
> {
  const {
    prompt,
    projectDescription,
    conversationHistory,
    apiKey,
    tools: { getDiagramData, applyModifications },
    isFollowUp = false,
  } = args;
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
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

    // 1. Initialize current conversation contents
    // If follow-up, start with history. If not, start empty.
    const currentContents: Content[] = isFollowUp
      ? conversationHistory.map((msg) => ({
          role: msg.role,
          parts: msg.parts,
        }))
      : [];

    // 2. Add the User's new prompt
    currentContents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    console.log("[excaligenius] Sending message to Gemini...");

    // 3. Main Loop: Generate -> Process -> (If Tools) Recurse
    // We loop until no more function calls are requested by the model
    let keepingGoing = true;

    while (keepingGoing) {
      keepingGoing = false; // Default to stopping unless we find tools

      const result = await model.generateContentStream({
        contents: currentContents,
        generationConfig: {
          temperature: 0.7,
        },
      });

      const functionCalls: FunctionCall[] = [];
      const textParts: string[] = [];

      // We need to capture the *exact* Model Response Part to add to history later
      // The chunks are partial. We need to aggregate the full function call.
      // However, for history, we just need a valid FunctionCall object.

      for await (const chunk of result.stream) {
        if (chunk.candidates) {
          chunk.candidates.forEach((can) => {
            currentContents.push({
              role: "model",
              parts: can.content.parts,
            });
          });
        }
        const text = chunk.text();
        if (text) {
          textParts.push(text);
          yield text;
        }

        const calls = chunk.functionCalls();
        if (calls && calls.length > 0) {
          functionCalls.push(...calls);
        }
      }
      // 4. Handle Function Calls
      if (functionCalls.length > 0) {
        console.log(
          `[excaligenius] Tools called: ${functionCalls
            .map((c) => c.name)
            .join(", ")}`
        );
        keepingGoing = true; // We need to send the results back

        const responseParts: Part[] = [];
        for (const call of functionCalls) {
          if (call.name === "get_excalidraw_data") {
            const diagramData = await getDiagramData();
            responseParts.push({
              functionResponse: {
                name: "get_excalidraw_data",
                response: { data: diagramData },
              },
            });
          } else if (call.name === "apply_excalidraw_modifications") {
            const args = call.args as {
              elements: ExcalidrawElement[];
              appState: AppState;
            };
            await applyModifications(args);
            responseParts.push({
              functionResponse: {
                name: "apply_excalidraw_modifications",
                response: { success: true },
              },
            });
          } else {
            console.warn(`[excaligenius] Unknown tool called: ${call.name}`);
            // If unknown, we should probably still send something or break?
            // For now, ignoring it might cause errors.
          }
        }

        // Add the Function Responses to history
        if (responseParts.length > 0) {
          currentContents.push({
            role: "function",
            parts: responseParts,
          });
        }
        // Loop continues to send this new history to 'generateContentStream'
      }
    }

    // Yield the full history so the UI can persist it
    yield { type: "complete", history: currentContents };
  } catch (error) {
    console.error("[excaligenius] Stream error:", error);
    throw error;
  }
}
