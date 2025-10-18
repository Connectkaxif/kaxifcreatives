import { ReactNode, useState, useEffect } from "react";
import { ToggleButton } from "./ToggleButton";
import { LockToggle } from "./LockToggle";
import { toast } from "sonner";

interface Props {
  title: string;
  children: ReactNode;
  lockKey: string;
  dataKey: string;
  value: string;
  onChange: (value: string) => void;
}

export const SectionWithToggle = ({ title, children, lockKey, dataKey, value, onChange }: Props) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lastSave, setLastSave] = useState<number>(0);

  // Load lock state and data on mount
  useEffect(() => {
    const savedLockState = localStorage.getItem(lockKey);
    if (savedLockState === "true") {
      setIsLocked(true);
      const savedData = localStorage.getItem(dataKey);
      if (savedData) {
        onChange(savedData);
      }
    }
  }, []);

  // Auto-save when locked
  useEffect(() => {
    if (isLocked) {
      const timer = setTimeout(() => {
        localStorage.setItem(dataKey, value);
        setLastSave(Date.now());
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [value, isLocked, dataKey]);

  // Save lock state
  useEffect(() => {
    localStorage.setItem(lockKey, isLocked.toString());
  }, [isLocked, lockKey]);

  const timeSinceLastSave = lastSave ? Math.floor((Date.now() - lastSave) / 1000) : null;

  return (
    <section className="bg-white border border-border rounded-xl p-5 mb-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-3">
          <LockToggle isLocked={isLocked} onChange={setIsLocked} />
          <ToggleButton isOn={isVisible} onToggle={() => setIsVisible(!isVisible)} />
        </div>
      </div>

      {isLocked && timeSinceLastSave !== null && (
        <p className="text-xs text-muted-foreground mb-3">
          Auto-saved {timeSinceLastSave}s ago
        </p>
      )}

      {isVisible && (
        <div className="relative">
          {children}
        </div>
      )}
    </section>
  );
};
