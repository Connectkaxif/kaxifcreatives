import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Lock, Unlock } from "lucide-react";
import { Character } from "@/types";
import { CharacterManagement } from "./CharacterManagement";

interface Props {
  characters: Character[];
  onChange: (characters: Character[]) => void;
}

export const SidebarCharacters = ({ characters, onChange }: Props) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_locked');
    if (saved) setIsLocked(saved === 'true');
  }, []);

  const handleLockToggle = () => {
    const newValue = !isLocked;
    setIsLocked(newValue);
    localStorage.setItem('sidebar_locked', String(newValue));
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-5 bottom-5 bg-white border border-border rounded-r-xl transition-all duration-300 z-40 ${
          isCollapsed ? "w-[50px]" : "w-[340px]"
        }`}
        style={{ boxShadow: '2px 0 8px rgba(0, 0, 0, 0.08)' }}
      >
        {/* Arrow button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-12 bg-white border border-primary rounded-r-lg hover:bg-primary hover:text-white transition-all flex items-center justify-center"
          style={{ boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)' }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-primary hover:text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-primary hover:text-white" />
          )}
        </button>

        {/* Content */}
        {!isCollapsed && (
          <div className="p-5 h-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Characters</h2>
              <button
                onClick={handleLockToggle}
                className="w-5 h-5 flex items-center justify-center"
                title="Lock to save data"
              >
                {isLocked ? (
                  <Lock className="w-[18px] h-[18px] text-primary" />
                ) : (
                  <Unlock className="w-[18px] h-[18px] text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CharacterManagement characters={characters} onChange={onChange} />
            </div>
          </div>
        )}
      </aside>

      {/* Spacer for collapsed sidebar */}
      <div className={`transition-all duration-300 ${isCollapsed ? "w-[50px]" : "w-[340px]"}`} />
    </>
  );
};
