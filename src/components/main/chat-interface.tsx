import { type FormEvent, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, AlertTriangle } from "lucide-react";
import { type ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

export function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
}: ChatInterfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const message = inputRef.current?.value;
    if (message) {
      onSendMessage(message);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.sender === "ai" && (
                <Avatar className="h-8 w-8 border-2 border-sidebar-border">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                    <Bot />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-xs rounded-lg p-3 text-sm",
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-sidebar-accent text-sidebar-accent-foreground",
                  message.isError &&
                    "bg-destructive text-destructive-foreground flex items-center gap-2"
                )}
              >
                {message.isError && <AlertTriangle className="h-4 w-4" />}
                {message.text}
              </div>
              {message.sender === "user" && (
                <Avatar className="h-8 w-8 border-2 border-sidebar-border">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                    <User />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
              <Avatar className="h-8 w-8 border-2 border-sidebar-border">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                  <Bot />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-xs rounded-lg p-3 bg-sidebar-accent">
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask for a modification..."
            className="flex-1 bg-background text-foreground"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
