import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, MousePointer2, MessageSquare, Play, X } from "lucide-react";

interface WelcomeGuideProps {
  onClose: () => void;
}

export function WelcomeGuide({ onClose }: WelcomeGuideProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl p-8 relative">
        <Card className="shadow-2xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-10 right-10 h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close welcome guide</span>
          </Button>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Lightbulb className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-center text-3xl font-bold">
              Welcome to ExcaliGenius!
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center p-4">
              <MousePointer2 className="w-10 h-10 mb-3 text-accent" />
              <h3 className="font-semibold mb-1">1. Create</h3>
              <p className="text-sm text-muted-foreground">
                Start by drawing any diagram on the canvas.
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <Play className="w-10 h-10 mb-3 text-accent" />
              <h3 className="font-semibold mb-1">2. Evaluate</h3>
              <p className="text-sm text-muted-foreground">
                Click 'Evaluate Diagram' to get an AI-powered explanation.
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <MessageSquare className="w-10 h-10 mb-3 text-accent" />
              <h3 className="font-semibold mb-1">3. Chat</h3>
              <p className="text-sm text-muted-foreground">
                Use the chat to ask for modifications to your diagram.
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <Lightbulb className="w-10 h-10 mb-3 text-accent" />
              <h3 className="font-semibold mb-1">4. Genius!</h3>
              <p className="text-sm text-muted-foreground">
                Watch the AI bring your ideas to life on the canvas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
