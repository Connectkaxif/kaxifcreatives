import { Lock, Unlock } from "lucide-react";

interface Props {
  isLocked: boolean;
  onChange: (isLocked: boolean) => void;
}

export const LockToggle = ({ isLocked, onChange }: Props) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Lock & Save</span>
      <button
        onClick={() => onChange(!isLocked)}
        className={`relative w-[50px] h-[26px] rounded-full transition-all duration-200 ${
          isLocked ? "bg-primary" : "bg-muted"
        }`}
        style={{
          boxShadow: isLocked 
            ? "0 2px 8px rgba(59, 130, 246, 0.3)" 
            : "0 2px 4px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div
          className={`absolute top-0.5 w-[22px] h-[22px] bg-white rounded-full shadow-md transition-transform duration-200 flex items-center justify-center ${
            isLocked ? "translate-x-[26px]" : "translate-x-0.5"
          }`}
        >
          {isLocked ? (
            <Lock className="w-3 h-3 text-primary" />
          ) : (
            <Unlock className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </button>
    </div>
  );
};
