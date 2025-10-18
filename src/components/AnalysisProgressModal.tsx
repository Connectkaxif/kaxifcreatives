import { Check, Loader2, Bot } from "lucide-react";

interface Step {
  label: string;
  icon: string;
  completed: boolean;
}

interface Props {
  isOpen: boolean;
  steps: Step[];
  progress: number;
  currentTask: string;
  estimatedTime: number;
}

export const AnalysisProgressModal = ({ isOpen, steps, progress, currentTask, estimatedTime }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-2xl" style={{ width: '420px' }}>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-foreground">AI Analysis in Progress</h3>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div 
            className="relative h-8 bg-gray-200 rounded-full overflow-hidden border border-gray-300"
            style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}
          >
            <div
              className="h-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Current Task */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground mb-2">Current Task:</p>
          <p className="text-sm text-muted-foreground">🧠 {currentTask}</p>
        </div>
        
        {/* Task List */}
        <div className="space-y-3 mb-4">
          <p className="text-sm font-semibold text-foreground">Completed Tasks:</p>
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-5 h-5 flex items-center justify-center ${
                step.completed ? 'text-green-600' : 'text-purple-600'
              }`}>
                {step.completed ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
              </div>
              <span className="text-sm">{step.icon}</span>
              <span className={`text-sm ${step.completed ? 'text-muted-foreground' : 'font-medium'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          Estimated time: {estimatedTime} seconds
        </p>
      </div>
    </div>
  );
};
