import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { GeneratedPrompt } from "@/types";
import { toast } from "sonner";

interface Props {
  prompts: GeneratedPrompt[];
  onClear: () => void;
  showNumbers: boolean;
  showScriptLines: boolean;
}

export const DownloadClearButtons = ({ prompts, onClear, showNumbers, showScriptLines }: Props) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const formatPromptForDownload = (prompt: GeneratedPrompt) => {
    let text = "";
    if (showNumbers) {
      text += `#${prompt.lineNumber}\n`;
    }
    if (showScriptLines) {
      text += `${prompt.sceneLine}\n\n`;
    }
    text += prompt.generatedText;
    return text;
  };

  const downloadTXT = () => {
    const content = prompts.map(formatPromptForDownload).join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const filename = `KXF_Creative_Script_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}.txt`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as TXT");
    setShowDownloadMenu(false);
  };

  const downloadDOCX = () => {
    // Simple DOCX-like format using HTML
    const content = prompts.map(formatPromptForDownload).join('\n\n---\n\n');
    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>KXF Creative Script</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; padding: 40px;">
<h1>KXF Creative Script</h1>
<pre style="white-space: pre-wrap;">${content}</pre>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const filename = `KXF_Creative_Script_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}.docx`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as DOCX");
    setShowDownloadMenu(false);
  };

  const handleClear = () => {
    const confirmed = window.confirm("Clear All Prompts?\n\nThis will delete all generated prompts. This action cannot be undone.");
    if (confirmed) {
      onClear();
      toast.success("All prompts cleared");
    }
  };

  if (prompts.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      {/* Download Button */}
      <div className="relative">
        <button
          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
          className="w-[280px] h-12 rounded-3xl bg-white border border-primary text-primary font-semibold text-[15px] hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
          style={{ boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)' }}
        >
          <Download className="w-4 h-4" />
          Download Script
        </button>

        {/* Dropdown Menu */}
        {showDownloadMenu && (
          <div 
            className="absolute top-14 left-1/2 -translate-x-1/2 w-[200px] bg-white border border-border rounded-lg overflow-hidden z-50"
            style={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}
          >
            <button
              onClick={downloadTXT}
              className="w-full h-10 px-4 flex items-center gap-3 text-sm text-[#374151] hover:bg-[#F0F9FF] hover:text-primary transition-colors"
            >
              <span className="text-lg">📄</span>
              Download as TXT
            </button>
            <button
              onClick={downloadDOCX}
              className="w-full h-10 px-4 flex items-center gap-3 text-sm text-[#374151] hover:bg-[#F0F9FF] hover:text-primary transition-colors"
            >
              <span className="text-lg">📘</span>
              Download as DOCX
            </button>
          </div>
        )}
      </div>

      {/* Clear Button */}
      <button
        onClick={handleClear}
        className="w-[220px] h-12 rounded-3xl bg-white border border-destructive text-destructive font-semibold text-[15px] hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2"
        style={{ boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)' }}
      >
        <Trash2 className="w-4 h-4" />
        Clear All Prompts
      </button>

      {/* Backdrop to close dropdown */}
      {showDownloadMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDownloadMenu(false)}
        />
      )}
    </div>
  );
};