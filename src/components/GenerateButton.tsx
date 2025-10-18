import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface Props {
  onClick: () => void;
  disabled: boolean;
}

export const GenerateButton = ({ onClick, disabled }: Props) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full max-w-[320px] h-[56px] text-base font-bold text-white rounded-full transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      style={{
        background: disabled ? 'hsl(var(--muted))' : 'linear-gradient(135deg, hsl(217 91% 60%), hsl(221 83% 53%))',
        boxShadow: disabled ? 'none' : '0 6px 20px rgba(59, 130, 246, 0.5)',
        transform: 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 10px 24px rgba(59, 130, 246, 0.5)';
          e.currentTarget.style.scale = '1.02';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
          e.currentTarget.style.scale = '1';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 3px 10px rgba(59, 130, 246, 0.3)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 10px 24px rgba(59, 130, 246, 0.5)';
        }
      }}
    >
      <Sparkles className="w-5 h-5 mr-2" />
      Generate Prompts
    </button>
  );
};
