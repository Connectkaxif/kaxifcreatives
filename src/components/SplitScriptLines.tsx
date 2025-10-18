import { Textarea } from "@/components/ui/textarea";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export const SplitScriptLines = ({ value, onChange }: Props) => {
  const [expanded, setExpanded] = useState(false);
  
  const lines = value.split('\n').filter(line => line.trim());
  const avgChars = lines.length > 0 
    ? Math.round(lines.reduce((sum, line) => sum + line.length, 0) / lines.length)
    : 0;
  const longLines = lines.filter(line => line.length > 300);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your split script here - one scene per line. Each line will generate one detailed image prompt..."
          className="w-full font-sans resize-none border border-border focus:border-2 focus:border-primary rounded-lg p-4 custom-scrollbar"
          style={{ 
            height: expanded ? '380px' : '200px',
            lineHeight: '2.0'
          }}
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
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <span className="font-semibold text-primary">{lines.length} lines detected</span>
          <span className="text-muted-foreground">~{avgChars} chars/line</span>
        </div>
        {longLines.length > 0 && (
          <span className="text-destructive">⚠️ {longLines.length} very long lines</span>
        )}
      </div>
    </div>
  );
};
