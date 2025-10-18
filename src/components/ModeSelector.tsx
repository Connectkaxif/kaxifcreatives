import { useEffect } from "react";
import { Hand, Bot } from "lucide-react";

type Mode = "manual" | "ai-advanced";

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export const ModeSelector = ({ mode, onChange }: Props) => {
  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('kxf-mode');
    if (saved === 'manual' || saved === 'ai-advanced') {
      onChange(saved);
    }
  }, []);

  const handleModeChange = (newMode: Mode) => {
    onChange(newMode);
    localStorage.setItem('kxf-mode', newMode);
  };

  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex bg-white rounded-[30px] p-1 shadow-md" style={{ width: '320px', height: '60px' }}>
        <button
          onClick={() => handleModeChange('manual')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-[26px] font-semibold transition-all duration-300 ${
            mode === 'manual'
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Hand className="w-5 h-5" />
          <span>Manual</span>
        </button>
        
        <button
          onClick={() => handleModeChange('ai-advanced')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-[26px] font-semibold transition-all duration-300 ${
            mode === 'ai-advanced'
              ? 'text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={mode === 'ai-advanced' ? {
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
          } : undefined}
        >
          <Bot className="w-5 h-5" />
          <span>AI Advanced</span>
        </button>
      </div>
    </div>
  );
};
