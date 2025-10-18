import { Textarea } from "@/components/ui/textarea";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export const FullScriptContext = ({ value, onChange }: Props) => {
  const [expanded, setExpanded] = useState(false);
  
  const characterCount = value.length;
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = value.split('\n').length;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your complete script here for AI to understand the full story, theme, characters, and narrative flow..."
          className="w-full font-sans resize-none border border-border focus:border-2 focus:border-primary rounded-lg p-4 custom-scrollbar"
          style={{ height: expanded ? '350px' : '180px' }}
        />

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="absolute bottom-3 right-3 p-1.5 bg-white border border-primary rounded-md hover:bg-primary hover:text-white transition-all"
          title="Expand"
          style={{ boxShadow: "var(--shadow-button)" }}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex gap-4">
          <span>{characterCount} characters</span>
          <span>{wordCount} words</span>
          <span>{lineCount} lines</span>
        </div>
      </div>
    </div>
  );
};
