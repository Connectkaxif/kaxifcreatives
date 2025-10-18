import { useState } from "react";
import { X } from "lucide-react";
import { Character } from "@/types";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";

interface Props {
  characters: Character[];
  onClose: () => void;
  onAdd: (selectedCharacters: Character[]) => void;
  currentPromptText: string;
}

export const CharacterInjectionPopup = ({ characters, onClose, onAdd, currentPromptText }: Props) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleCharacter = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleAdd = () => {
    const selected = characters.filter(c => selectedIds.has(c.id));
    
    // Check for duplicates
    const duplicates = selected.filter(c => 
      currentPromptText.toLowerCase().includes(c.name.toLowerCase())
    );

    if (duplicates.length > 0) {
      const confirmReplace = window.confirm(
        `${duplicates.map(c => c.name).join(', ')} already in prompt. Replace?`
      );
      if (!confirmReplace) return;
    }

    onAdd(selected);
    toast.success(`✓ Added ${selected.length} character(s) to prompt`);
    onClose();
  };

  const lockedCharacters = characters.filter(c => c.locked);
  const regularCharacters = characters.filter(c => !c.locked);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Popup */}
      <div 
        className="relative bg-white border border-border rounded-xl w-[300px] max-h-[380px] flex flex-col"
        style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-[50px] bg-[#F0F9FF] border-b border-border px-4 flex items-center justify-between rounded-t-xl">
          <h3 className="text-base font-semibold text-foreground">Add Characters</h3>
          <button 
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character List */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {/* Locked Characters Section */}
          {lockedCharacters.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-[#F59E0B] mb-2 bg-[#FFFBEB] px-2 py-1 rounded">
                🔒 Locked Characters
              </div>
              {lockedCharacters.map(char => (
                <div 
                  key={char.id}
                  className="h-auto min-h-[60px] p-2.5 border-b border-[#F3F4F6] bg-[#FFFBEB]/30"
                >
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      checked={true}
                      disabled={true}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                        {char.name}
                        <span className="text-xs">🔒</span>
                      </div>
                      {char.appearance && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {char.appearance}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Regular Characters */}
          {regularCharacters.map(char => (
            <div 
              key={char.id}
              className="h-auto min-h-[60px] p-2.5 border-b border-[#F3F4F6] hover:bg-[#F0F9FF] transition-colors cursor-pointer"
              onClick={() => toggleCharacter(char.id)}
            >
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={selectedIds.has(char.id)}
                  onCheckedChange={() => toggleCharacter(char.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {char.name}
                  </div>
                  {char.appearance && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {char.appearance}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-border px-4 flex items-center bg-white rounded-b-xl">
          <button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 && lockedCharacters.length === 0}
            className="w-full h-[38px] rounded-[19px] text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: selectedIds.size > 0 || lockedCharacters.length > 0 
                ? 'linear-gradient(135deg, #3B82F6, #2563EB)' 
                : '#9CA3AF'
            }}
          >
            Add Selected ({selectedIds.size + lockedCharacters.length})
          </button>
        </div>
      </div>
    </div>
  );
};