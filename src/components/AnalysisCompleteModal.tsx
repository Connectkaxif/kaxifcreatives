import { CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

interface AnalysisResults {
  charactersDetected: number;
  unnamedCharactersCreated: number;
  linesGenerated: number;
  storyTheme: string;
  tone: string;
}

interface Props {
  isOpen: boolean;
  results: AnalysisResults | null;
  onClose: () => void;
}

export const AnalysisCompleteModal = ({ isOpen, results, onClose }: Props) => {
  if (!isOpen || !results) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-2xl" style={{ width: '420px' }}>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <h3 className="text-xl font-bold text-foreground">AI Analysis Complete!</h3>
        </div>
        
        <div className="mb-6 space-y-2">
          <p className="font-semibold text-foreground mb-3">📊 Results:</p>
          <div className="space-y-1 text-sm">
            <p>• <span className="font-medium">{results.charactersDetected}</span> characters detected</p>
            <p>• <span className="font-medium">{results.unnamedCharactersCreated}</span> unnamed characters created</p>
            <p>• <span className="font-medium">{results.linesGenerated}</span> lines generated</p>
            <p>• Story theme: <span className="font-medium">{results.storyTheme}</span></p>
            <p>• Tone: <span className="font-medium">{results.tone}</span></p>
          </div>
          
          <p className="mt-4 text-sm font-medium text-green-600">
            All fields auto-filled! ✨
          </p>
        </div>
        
        <Button onClick={onClose} className="w-full">
          OK
        </Button>
      </div>
    </div>
  );
};
