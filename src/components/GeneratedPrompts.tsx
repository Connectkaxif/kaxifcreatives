import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Users, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { GeneratedPrompt, Character } from "@/types";
import { toast } from "sonner";
import { CharacterInjectionPopup } from "./CharacterInjectionPopup";

interface Props {
  prompts: GeneratedPrompt[];
  characters: Character[];
  showNumbers: boolean;
  showScriptLines: boolean;
}

export const GeneratedPrompts = ({ prompts, characters, showNumbers, showScriptLines }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typingPrompts, setTypingPrompts] = useState<Map<string, string>>(new Map());
  const [characterPopupPromptId, setCharacterPopupPromptId] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Map<string, string>>(new Map());
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    // Implement typing animation for new prompts
    prompts.forEach(prompt => {
      if (!typingPrompts.has(prompt.id)) {
        const fullText = prompt.generatedText;
        let currentIndex = 0;
        
        const interval = setInterval(() => {
          if (currentIndex < fullText.length) {
            setTypingPrompts(prev => {
              const newMap = new Map(prev);
              newMap.set(prompt.id, fullText.substring(0, currentIndex + 1));
              return newMap;
            });
            currentIndex++;
          } else {
            clearInterval(interval);
          }
        }, 20);
      }
    });
  }, [prompts]);

  const formatPromptForCopy = (prompt: GeneratedPrompt) => {
    let text = "";
    if (showNumbers) {
      text += `#${prompt.lineNumber}\n`;
    }
    if (showScriptLines) {
      text += `${prompt.sceneLine}\n\n`;
    }
    text += prompt.generatedText;
    return text;
  };

  const copyPrompt = (prompt: GeneratedPrompt) => {
    navigator.clipboard.writeText(formatPromptForCopy(prompt));
    toast.success("Copied to clipboard!");
  };

  const copySelected = () => {
    const selectedPrompts = prompts
      .filter(p => selected.has(p.id))
      .map(p => formatPromptForCopy(p))
      .join('\n\n');
    navigator.clipboard.writeText(selectedPrompts);
    toast.success(`Copied ${selected.size} prompts!`);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(prompts.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleCharacterInjection = (promptId: string, selectedCharacters: Character[]) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    let updatedText = editedPrompts.get(promptId) || prompt.generatedText;
    
    // Find position after reference style (first sentence/phrase)
    const firstPeriod = updatedText.indexOf('.');
    const insertPosition = firstPeriod > 0 ? firstPeriod + 1 : 0;

    // Build character descriptions
    const characterDescriptions = selectedCharacters.map(char => {
      let desc = `, ${char.name}`;
      if (char.appearance) desc += `, ${char.appearance}`;
      if (char.aliases) desc += ` (${char.aliases})`;
      return desc;
    }).join('');

    // Insert characters
    const before = updatedText.substring(0, insertPosition);
    const after = updatedText.substring(insertPosition);
    const newText = before + characterDescriptions + after;

    setEditedPrompts(prev => {
      const newMap = new Map(prev);
      newMap.set(promptId, newText);
      return newMap;
    });

    setCharacterPopupPromptId(null);
  };

  const getPromptText = (prompt: GeneratedPrompt) => {
    return editedPrompts.get(prompt.id) || typingPrompts.get(prompt.id) || prompt.generatedText;
  };

  const handleEdit = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;
    
    setEditingPromptId(promptId);
    setEditingText(getPromptText(prompt));
  };

  const handleSave = (promptId: string) => {
    if (!editingText.trim()) {
      toast.error("Prompt cannot be empty");
      return;
    }

    setEditedPrompts(prev => {
      const newMap = new Map(prev);
      newMap.set(promptId, editingText);
      return newMap;
    });

    setEditingPromptId(null);
    setEditingText("");
    toast.success("✓ Prompt updated");
  };

  const handleCancel = () => {
    setEditingPromptId(null);
    setEditingText("");
  };

  return (
    <section className="space-y-4">
      {/* Control bar */}
      <div className="bg-white border border-border rounded-lg p-2.5 flex items-center justify-between gap-3 h-12 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="h-8 px-4 rounded-full border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-all"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="h-8 px-4 rounded-full border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-all"
          >
            Deselect All
          </button>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-2">
          <button
            onClick={copySelected}
            disabled={selected.size === 0}
            className="h-8 px-4 rounded-full text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{
              background: selected.size > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              boxShadow: selected.size > 0 ? 'var(--shadow-button)' : 'none',
            }}
          >
            <Copy className="w-3.5 h-3.5 inline mr-1.5" />
            Copy Selected ({selected.size})
          </button>
        </div>
      </div>

      {/* Prompt cards */}
      <div className="space-y-4">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="bg-white border border-border rounded-lg p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
            <div className="space-y-3">
              {/* Bullet number */}
              {showNumbers && (
                <div className="text-lg font-bold text-primary">
                  #{prompt.lineNumber}
                </div>
              )}
              
              {/* Script line */}
              {showScriptLines && (
                <div className="text-sm font-semibold text-foreground bg-[#F9FAFB] border border-border p-3 rounded-md mb-3">
                  {prompt.sceneLine}
                </div>
              )}
              
              {/* Generated prompt or edit mode */}
              {editingPromptId === prompt.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full min-h-[120px] max-h-[300px] p-3 border-2 border-primary rounded-lg text-sm leading-relaxed resize-y custom-scrollbar"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        handleCancel();
                      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        handleSave(prompt.id);
                      }
                    }}
                  />
                  <div className="text-xs text-muted-foreground">
                    {editingText.length} characters
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSave(prompt.id)}
                      className="h-9 px-6 rounded-[18px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5"
                      style={{ boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)' }}
                    >
                      ✓ Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="h-9 px-6 rounded-[18px] border border-border bg-white text-muted-foreground text-sm font-semibold hover:bg-muted transition-all flex items-center gap-1.5"
                    >
                      × Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
                    {getPromptText(prompt)}
                    {typingPrompts.get(prompt.id) && typingPrompts.get(prompt.id) !== prompt.generatedText && (
                      <span className="animate-pulse">▊</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={selected.has(prompt.id)}
                      onCheckedChange={() => toggleSelect(prompt.id)}
                      className="w-5 h-5"
                    />
                    <button
                      onClick={() => copyPrompt(prompt)}
                      className="h-8 px-4 rounded-2xl border border-primary text-primary text-sm hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                      style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                    <button
                      onClick={() => setCharacterPopupPromptId(prompt.id)}
                      className="h-8 w-9 rounded-2xl border border-primary text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center relative"
                      style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                      title="Add characters"
                    >
                      <Users className="w-4 h-4" />
                      {characters.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-primary text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                          {characters.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(prompt.id)}
                      className="h-8 w-[70px] rounded-2xl border border-border text-muted-foreground hover:bg-muted transition-all flex items-center justify-center gap-1"
                      style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      className="h-8 w-9 rounded-2xl border border-destructive text-destructive hover:bg-destructive hover:text-white transition-all flex items-center justify-center"
                      style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Character Injection Popup */}
      {characterPopupPromptId && (
        <CharacterInjectionPopup
          characters={characters}
          onClose={() => setCharacterPopupPromptId(null)}
          onAdd={(selectedChars) => handleCharacterInjection(characterPopupPromptId, selectedChars)}
          currentPromptText={getPromptText(prompts.find(p => p.id === characterPopupPromptId)!)}
        />
      )}
    </section>
  );
};
