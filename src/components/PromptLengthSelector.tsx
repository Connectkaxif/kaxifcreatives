import { PromptLength } from "@/types";
import { useEffect } from "react";

interface Props {
  value: PromptLength;
  onChange: (value: PromptLength) => void;
  showNumbers: boolean;
  onShowNumbersChange: (value: boolean) => void;
  showScriptLines: boolean;
  onShowScriptLinesChange: (value: boolean) => void;
}

const options = [
  { value: 'quick' as PromptLength, label: 'Short (15-20)', wordRange: '15-20' },
  { value: 'balanced' as PromptLength, label: 'Medium (25-45)', wordRange: '25-45' },
  { value: 'detailed' as PromptLength, label: 'Large (50-75)', wordRange: '50-75' },
  { value: 'extended' as PromptLength, label: 'Extra (85-100)', wordRange: '85-100' },
];

export const PromptLengthSelector = ({ 
  value, 
  onChange, 
  showNumbers, 
  onShowNumbersChange,
  showScriptLines,
  onShowScriptLinesChange 
}: Props) => {
  useEffect(() => {
    const savedShowNumbers = localStorage.getItem('promptShowNumbers');
    const savedShowSLWP = localStorage.getItem('promptShowSLWP');
    if (savedShowNumbers !== null) onShowNumbersChange(savedShowNumbers === 'true');
    if (savedShowSLWP !== null) onShowScriptLinesChange(savedShowSLWP === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('promptShowNumbers', String(showNumbers));
  }, [showNumbers]);

  useEffect(() => {
    localStorage.setItem('promptShowSLWP', String(showScriptLines));
  }, [showScriptLines]);

  return (
    <div className="bg-white border border-border rounded-lg p-3 mb-5 flex items-center justify-between gap-4 shadow-[var(--shadow-soft)] h-[50px]">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Prompt Length:
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as PromptLength)}
          className="h-8 px-2.5 bg-white border border-border rounded-lg text-sm cursor-pointer focus:border-2 focus:border-primary outline-none"
          style={{ width: '160px' }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onShowNumbersChange(!showNumbers)}
            className={`relative w-9 h-5 rounded-[10px] transition-all ${
              showNumbers ? "bg-primary" : "bg-muted"
            }`}
            style={{
              boxShadow: showNumbers 
                ? "0 2px 8px rgba(59, 130, 246, 0.3)" 
                : "0 2px 4px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                showNumbers ? "translate-x-[20px]" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">Show Numbers</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onShowScriptLinesChange(!showScriptLines)}
            className={`relative w-9 h-5 rounded-[10px] transition-all ${
              showScriptLines ? "bg-primary" : "bg-muted"
            }`}
            style={{
              boxShadow: showScriptLines 
                ? "0 2px 8px rgba(59, 130, 246, 0.3)" 
                : "0 2px 4px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                showScriptLines ? "translate-x-[20px]" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">SLWP</span>
        </div>
      </div>
    </div>
  );
};
