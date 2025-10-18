import { Bot, Loader2 } from "lucide-react";

interface Props {
  onClick: () => void;
  isAnalyzing: boolean;
  disabled: boolean;
}

export const AIAnalyseButton = ({ onClick, isAnalyzing, disabled }: Props) => {
  return (
    <div className="flex justify-center my-6">
      <button
        onClick={onClick}
        disabled={disabled || isAnalyzing}
        className="flex items-center justify-center gap-2 px-8 py-4 text-white font-bold text-base rounded-[28px] shadow-lg transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        style={{
          width: '220px',
          height: '56px',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
        }}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <Bot className="w-5 h-5" />
            <span>AI ANALYSE</span>
          </>
        )}
      </button>
    </div>
  );
};
