import { ApiKeyDialog } from "@/components/main/api-key-dialog";
import { ChatInterface } from "@/components/main/chat-interface";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { type ChatMessage } from "@/lib/types";
import { ArrowLeft, BrainCircuit, Play, Settings } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { WelcomeGuide } from "./welcome-guide";
import { Button } from "@/components/ui/button";
import {
  GoogleGenerativeAI,
  type GenerationConfig,
  type SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { toast } from "sonner";
import { DiagramCanvas } from "./diagram-canvas";

const MODEL_NAME = "gemini-2.5-flash";

export default function ExcaliGeniusClient() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any | null>(null);
  const [excalidrawElements, setExcalidrawElements] = useState<readonly any[]>(
    []
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarView, setSidebarView] = useState<"controls" | "chat">(
    "controls"
  );
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(true);

  const genAI = useMemo(() => {
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
  }, [apiKey]);

  useEffect(() => {
    const storedApiKey = localStorage.getItem("gemini_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setIsApiKeyDialogOpen(true);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("gemini_api_key", key);
  };

  const handleDiagramChange = useCallback((elements: readonly any[]) => {
    setExcalidrawElements(elements);
  }, []);

  const handleEvaluate = async () => {
    if (!excalidrawAPI || !genAI) return;
    const elements = excalidrawAPI.getSceneElements();
    if (elements.length === 0) {
      toast.error("Empty Diagram", {
        description: "Please draw something on the canvas before evaluating.",
      });
      return;
    }

    setIsLoading(true);
    setSidebarView("chat");

    try {
      const diagramJson = JSON.stringify(elements);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt = `You are an expert at explaining diagrams.

  Analyze the following Excalidraw diagram represented as a JSON string, and provide a clear and concise explanation of the diagram, including its key components and their relationships.
  \nDiagram JSON:\n${diagramJson}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const explanation = response.text();

      setMessages([
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: explanation,
        },
      ]);
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages([
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: `I had trouble evaluating the diagram. ${errorMessage}`,
          isError: true,
        },
      ]);
      toast.error("Evaluation Failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!excalidrawAPI || !genAI) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: message,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const diagramContext = JSON.stringify(excalidrawAPI.getSceneElements());
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: `You are an AI expert in modifying Excalidraw diagrams. The user will provide the current diagram context, as well as a request how to modify the diagram. Apply the modification and respond with only the complete, modified diagram context in a JSON code block.`,
      });

      const generationConfig: GenerationConfig = {
        responseMimeType: "application/json",
      };

      const safetySettings: SafetySetting[] = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];

      const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [
          {
            role: "user",
            parts: [
              {
                text: `Current Diagram Context:
${diagramContext}

Modification Request:
${message}`,
              },
            ],
          },
        ],
      });

      const result = await chat.sendMessage("ignored");
      const response = result.response;
      const modifiedDiagramContext = response.text();

      const newElements = JSON.parse(modifiedDiagramContext);
      excalidrawAPI.updateScene({ elements: newElements });

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: "I've updated the diagram as you requested. What's next?",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      const aiErrorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: `Sorry, I couldn't modify the diagram. ${errorMessage}`,
        isError: true,
      };
      setMessages((prev) => [...prev, aiErrorMessage]);
      toast.error("Modification Failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDiagramEmpty = excalidrawElements.length === 0;

  return (
    <SidebarProvider>
      <Sidebar
        collapsible="offcanvas"
        className="border-r border-sidebar-border"
      >
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-8 w-8 text-sidebar-foreground" />
              <h1 className="text-xl font-semibold text-sidebar-foreground">
                ExcaliGenius
              </h1>
            </div>
            {sidebarView === "chat" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => setSidebarView("controls")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-0">
          {sidebarView === "controls" ? (
            <div className="p-4">
              <Button
                onClick={handleEvaluate}
                disabled={isLoading || !apiKey || isDiagramEmpty}
                className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                size="lg"
              >
                <Play className="mr-2 h-5 w-5" />
                Evaluate Diagram
              </Button>
            </div>
          ) : (
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
            />
          )}
        </SidebarContent>

        <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsApiKeyDialogOpen(true)}
                className="w-full"
                tooltip="Settings"
              >
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="relative">
        {isDiagramEmpty && sidebarView === "controls" && showWelcomeGuide && (
          <WelcomeGuide onClose={() => setShowWelcomeGuide(false)} />
        )}
        <DiagramCanvas
          onReady={setExcalidrawAPI}
          onChange={handleDiagramChange}
        />
      </SidebarInset>
      <ApiKeyDialog
        open={isApiKeyDialogOpen}
        onOpenChange={setIsApiKeyDialogOpen}
        onSave={handleSaveApiKey}
      />
    </SidebarProvider>
  );
}
