import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldAlert } from "lucide-react";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (apiKey: string) => void;
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  onSave,
}: ApiKeyDialogProps) {
  const [key, setKey] = useState("");

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Set Your Gemini API Key
          </DialogTitle>
          <DialogDescription>
            You need to provide your own Gemini API key to use the AI features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right">
              API Key
            </Label>
            <Input
              id="api-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="col-span-3"
              placeholder="Enter your API key"
              type="password"
            />
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Your API key is stored in your browser's local storage and is not sent to our servers. However, for this demonstration, AI requests will use the server-configured API key.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!key.trim()}>
            Save Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
