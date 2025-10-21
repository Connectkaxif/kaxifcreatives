import { useState } from "react";
import { Upload, FileText, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExtractedCharacter {
  name: string;
  description: string;
  type: 'main' | 'side';
}

interface CharacterStats {
  totalCount: number;
  mainCount: number;
  sideCount: number;
  mainCharacters: string[];
  sideCharacters: string[];
}

export const CharacterBuilder = () => {
  const [storyText, setStoryText] = useState("");
  const [showTextarea, setShowTextarea] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [characters, setCharacters] = useState<ExtractedCharacter[]>([]);
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['.txt', '.docx', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExtension)) {
      toast.error("Please upload a .txt, .docx, or .pdf file");
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setStoryText(text);
      setShowTextarea(true);
      toast.success("Story uploaded successfully!");
    };
    reader.readAsText(file);
  };

  const handleBuildCharacters = async () => {
    if (!storyText.trim()) {
      toast.error("Please upload or paste a story first");
      return;
    }

    setIsBuilding(true);
    setCharacters([]);
    setStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('build-characters', {
        body: { storyText }
      });

      if (error) throw error;

      if (data?.characters && Array.isArray(data.characters)) {
        setCharacters(data.characters);
        setStats({
          totalCount: data.totalCount || data.characters.length,
          mainCount: data.mainCount || 0,
          sideCount: data.sideCount || 0,
          mainCharacters: data.mainCharacters || [],
          sideCharacters: data.sideCharacters || []
        });
        toast.success(`Found ${data.totalCount || data.characters.length} characters!`);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      console.error("Character building error:", error);
      toast.error(error.message || "Failed to build characters");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleCopy = (description: string, index: number) => {
    navigator.clipboard.writeText(description);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleEdit = (index: number, newDescription: string) => {
    const updated = [...characters];
    updated[index].description = newDescription;
    setCharacters(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Input Section */}
      <div className="bg-white rounded-lg p-8 shadow-md space-y-6">
        <div className="flex gap-4 justify-center">
          <label htmlFor="file-upload">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Story
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <Button
            variant="outline"
            onClick={() => setShowTextarea(!showTextarea)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Paste Story
          </Button>
        </div>

        {showTextarea && (
          <div className="space-y-3 animate-fade-in">
            <Textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="Paste your story here..."
              className="min-h-[200px] resize-none border-2 focus:border-primary"
            />
            <div className="text-sm text-muted-foreground text-right">
              {storyText.trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleBuildCharacters}
            disabled={isBuilding || !storyText.trim()}
            className="px-8 py-6 text-lg font-semibold"
            style={{
              background: isBuilding 
                ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
            }}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isBuilding ? "Building Characters..." : "Build Your Characters"}
          </Button>
        </div>
      </div>

      {/* Character Stats */}
      {stats && (
        <div className="bg-white rounded-lg p-6 shadow-md space-y-4 animate-fade-in">
          <h2 className="text-2xl font-bold text-center mb-4">Character Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats.totalCount}</div>
              <div className="text-sm text-muted-foreground">Total Characters</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats.mainCount}</div>
              <div className="text-sm text-muted-foreground">Main Characters</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{stats.sideCount}</div>
              <div className="text-sm text-muted-foreground">Side Characters</div>
            </div>
          </div>

          {stats.mainCharacters.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Main Characters (explicitly named):</h3>
              <p className="text-sm">{stats.mainCharacters.join(', ')}</p>
            </div>
          )}

          {stats.sideCharacters.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Side Characters (generated names):</h3>
              <p className="text-sm">{stats.sideCharacters.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Characters Output */}
      {characters.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Your Characters</h2>
          {characters.map((character, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                    {character.type === 'main' ? '⭐ Main Character' : '✨ Side Character'}
                  </div>
                  {editingIndex === index ? (
                    <Textarea
                      value={character.description}
                      onChange={(e) => handleEdit(index, e.target.value)}
                      onBlur={() => setEditingIndex(null)}
                      className="font-medium resize-none"
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-lg font-medium cursor-text hover:bg-muted/30 p-2 rounded transition-colors"
                      onClick={() => setEditingIndex(index)}
                    >
                      {character.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(character.description, index)}
                  className="flex-shrink-0"
                >
                  {copiedIndex === index ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
