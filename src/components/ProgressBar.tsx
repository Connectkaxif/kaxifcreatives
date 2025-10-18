interface Props {
  progress: number;
}

export const ProgressBar = ({ progress }: Props) => {
  return (
    <div className="w-full max-w-[500px] mx-auto space-y-3 animate-slide-up">
      <div className="relative h-9 bg-gray-100 rounded-full overflow-hidden" style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ 
            width: `${progress}%`,
            background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(213 97% 69%))',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold text-white font-mono" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        Generating prompts... {Math.round(progress)}% complete
      </div>
    </div>
  );
};
