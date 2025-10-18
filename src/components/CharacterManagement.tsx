import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Character } from "@/types";

interface Props {
  characters: Character[];
  onChange: (characters: Character[]) => void;
}

export const CharacterManagement = ({ characters, onChange }: Props) => {
  const addCharacter = () => {
    const newChar: Character = {
      id: crypto.randomUUID(),
      name: "",
      appearance: "",
      aliases: "",
      locked: false,
    };
    onChange([...characters, newChar]);
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    onChange(characters.map(char => 
      char.id === id ? { ...char, ...updates } : char
    ));
  };

  const removeCharacter = (id: string) => {
    onChange(characters.filter(char => char.id !== id));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Character Management</h2>

      <button
        onClick={addCharacter}
        className="w-full h-11 rounded-full text-white text-sm font-semibold flex items-center justify-center transition-all"
        style={{
          background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(213 97% 69%))',
          boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Character
      </button>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
        {characters.map((character) => (
          <div key={character.id} className="bg-white border border-border rounded-lg p-4 shadow-[var(--shadow-soft)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-foreground text-sm font-semibold">Name</label>
                <button
                  onClick={() => removeCharacter(character.id)}
                  className="text-destructive hover:bg-red-50 rounded p-1 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Input
                placeholder="Character name"
                value={character.name}
                onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                className="bg-white border-border focus:border-2 focus:border-primary text-foreground placeholder:text-muted-foreground"
              />

              <div>
                <label className="text-foreground text-sm font-semibold block mb-2">Character Description</label>
                <Textarea
                  placeholder="Physical appearance, clothing, etc."
                  value={character.appearance}
                  onChange={(e) => updateCharacter(character.id, { appearance: e.target.value })}
                  className="bg-white border-border focus:border-2 focus:border-primary text-foreground placeholder:text-muted-foreground resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-foreground text-sm font-semibold block mb-2">Aliases/Nicknames</label>
                <Input
                  placeholder="Alternative names"
                  value={character.aliases}
                  onChange={(e) => updateCharacter(character.id, { aliases: e.target.value })}
                  className="bg-white border-border focus:border-2 focus:border-primary text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => updateCharacter(character.id, { locked: !character.locked })}
                  className={`relative w-11 h-6 rounded-full transition-all ${
                    character.locked ? "bg-primary" : "bg-muted"
                  }`}
                  style={{
                    boxShadow: character.locked 
                      ? "0 2px 8px rgba(59, 130, 246, 0.3)" 
                      : "0 2px 4px rgba(0, 0, 0, 0.1)"
                  }}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      character.locked ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-muted-foreground">Lock to all prompts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
