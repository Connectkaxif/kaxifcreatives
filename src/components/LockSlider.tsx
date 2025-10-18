import { Save, Unlock, Shield } from "lucide-react";

type LockMode = "reload" | "free" | "protect";

interface Props {
  mode: LockMode;
  onChange: (mode: LockMode) => void;
}

export const LockSlider = ({ mode, onChange }: Props) => {
  const getSliderPosition = () => {
    switch (mode) {
      case "reload": return "translate-x-0";
      case "free": return "translate-x-[90px]";
      case "protect": return "translate-x-[180px]";
    }
  };

  const getSliderColor = () => {
    switch (mode) {
      case "reload": return "bg-blue-500";
      case "free": return "bg-gray-400";
      case "protect": return "bg-red-500";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-[280px] h-[50px] bg-gray-200 rounded-full">
        {/* Track markers */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <button
            onClick={() => onChange("reload")}
            className="flex flex-col items-center gap-1 z-10 transition-opacity hover:opacity-80"
          >
            <Save className={`w-5 h-5 ${mode === "reload" ? "text-white" : "text-gray-600"}`} />
          </button>
          <button
            onClick={() => onChange("free")}
            className="flex flex-col items-center gap-1 z-10 transition-opacity hover:opacity-80"
          >
            <Unlock className={`w-5 h-5 ${mode === "free" ? "text-white" : "text-gray-600"}`} />
          </button>
          <button
            onClick={() => onChange("protect")}
            className="flex flex-col items-center gap-1 z-10 transition-opacity hover:opacity-80"
          >
            <Shield className={`w-5 h-5 ${mode === "protect" ? "text-white" : "text-gray-600"}`} />
          </button>
        </div>

        {/* Sliding handle */}
        <div
          className={`absolute top-1 left-1 w-[86px] h-[42px] rounded-full shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center ${getSliderColor()} ${getSliderPosition()}`}
        >
          {mode === "reload" && <Save className="w-5 h-5 text-white" />}
          {mode === "free" && <Unlock className="w-5 h-5 text-white" />}
          {mode === "protect" && <Shield className="w-5 h-5 text-white" />}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs font-medium w-[280px]">
        <span className={mode === "reload" ? "text-blue-500" : "text-gray-500"}>Reload Lock</span>
        <span className={mode === "free" ? "text-gray-600" : "text-gray-500"}>Free Mode</span>
        <span className={mode === "protect" ? "text-red-500" : "text-gray-500"}>Protect Mode</span>
      </div>
    </div>
  );
};
