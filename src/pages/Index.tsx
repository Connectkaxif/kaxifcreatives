import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { ModeSelector } from "@/components/ModeSelector";
import { SidebarCharacters } from "@/components/SidebarCharacters";
import { SectionWithToggle } from "@/components/SectionWithToggle";
import { FullScriptContext } from "@/components/FullScriptContext";
import { SplitScriptLines } from "@/components/SplitScriptLines";
import { ReferenceStyle } from "@/components/ReferenceStyle";
import { PromptLengthSelector } from "@/components/PromptLengthSelector";
import { GenerateButton } from "@/components/GenerateButton";
import { ProgressBar } from "@/components/ProgressBar";
import { GeneratedPrompts } from "@/components/GeneratedPrompts";
import { DownloadClearButtons } from "@/components/DownloadClearButtons";
import { AIAnalyseButton } from "@/components/AIAnalyseButton";
import { AnalysisProgressModal } from "@/components/AnalysisProgressModal";
import { AnalysisCompleteModal } from "@/components/AnalysisCompleteModal";
import { Character, GeneratedPrompt, PromptLength } from "@/types";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  
  // Main state
  const [mode, setMode] = useState<"manual" | "ai-advanced">("manual");
  const [fullContext, setFullContext] = useState("");
  const [splitLines, setSplitLines] = useState("");
  const [referenceStyle, setReferenceStyle] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [promptLength, setPromptLength] = useState<PromptLength>("balanced");
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const [showScriptLines, setShowScriptLines] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState([
    { label: 'Reading full script...', icon: '⚡', completed: false },
    { label: 'Analyzing story theme...', icon: '🧠', completed: false },
    { label: 'Detecting characters...', icon: '👥', completed: false },
    { label: 'Breaking into lines...', icon: '✂️', completed: false },
    { label: 'Creating profiles...', icon: '✨', completed: false },
  ]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisCurrentTask, setAnalysisCurrentTask] = useState("");
  const [analysisEstimatedTime, setAnalysisEstimatedTime] = useState(17);
  const [showAnalysisComplete, setShowAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  // Refs for cleanup and control
  const mountedRef = useRef(true);
  const shouldContinueRef = useRef(true);
  const generationAbortController = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      shouldContinueRef.current = false;
      if (generationAbortController.current) {
        generationAbortController.current.abort();
      }
    };
  }, []);

  // Countdown timer for estimated time during AI analysis
  useEffect(() => {
    if (!isAnalyzing || analysisEstimatedTime <= 0) return;
    
    const interval = setInterval(() => {
      setAnalysisEstimatedTime(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isAnalyzing, analysisEstimatedTime]);

  // AI ANALYSE HANDLER - FIXED VERSION
  const handleAIAnalyse = async () => {
    // Validation
    if (!fullContext.trim()) {
      toast({
        title: "Error",
        description: "Please paste your script in Full Script Context first",
        variant: "destructive"
      });
      return;
    }

    // Initialize analysis state
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisCurrentTask("Initializing analysis");
    setAnalysisEstimatedTime(17);
    setAnalysisSteps(steps => steps.map(s => ({ ...s, completed: false })));

    try {
      // Stage 1: Reading script (0-10%)
      setAnalysisCurrentTask("Reading full script");
      setAnalysisProgress(5);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!mountedRef.current) return;
      
      setAnalysisSteps(steps => steps.map((s, i) => i === 0 ? { ...s, completed: true } : s));
      setAnalysisProgress(10);

      // Stage 2: Story analysis (10-25%)
      setAnalysisCurrentTask("Analyzing story theme and tone");
      setAnalysisEstimatedTime(12);
      setAnalysisProgress(15);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ 
            fullContext,
            mode: 'advanced',
            options: {
              detectCharacters: true,
              breakLines: true,
              analyzeTheme: true,
              createUnnamedProfiles: true
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!mountedRef.current) return;
      
      // Validate response structure
      if (!data || !data.analysis) {
        throw new Error('Invalid response structure from AI analysis');
      }
      
      setAnalysisSteps(steps => steps.map((s, i) => i === 1 ? { ...s, completed: true } : s));
      setAnalysisProgress(25);

      // Stage 3: Character detection (25-55%)
      setAnalysisCurrentTask("Detecting and analyzing characters");
      setAnalysisEstimatedTime(8);
      setAnalysisProgress(40);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (!mountedRef.current) return;
      
      setAnalysisSteps(steps => steps.map((s, i) => i === 2 ? { ...s, completed: true } : s));
      setAnalysisProgress(55);

      // Stage 4: Line breaking (55-80%)
      setAnalysisCurrentTask("Breaking script into optimal lines");
      setAnalysisEstimatedTime(5);
      setAnalysisProgress(65);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!mountedRef.current) return;
      
      setAnalysisSteps(steps => steps.map((s, i) => i === 3 ? { ...s, completed: true } : s));
      setAnalysisProgress(80);

      // Stage 5: Profile generation (80-100%)
      setAnalysisCurrentTask("Creating detailed character profiles");
      setAnalysisEstimatedTime(2);
      setAnalysisProgress(90);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!mountedRef.current) return;
      
      setAnalysisSteps(steps => steps.map((s, i) => i === 4 ? { ...s, completed: true } : s));
      setAnalysisProgress(100);

      if (data.success) {
        console.log('AI Analysis complete:', {
          characters: data.analysis.characters?.length || 0,
          lines: data.analysis.lines?.length || 0,
          theme: data.analysis.theme
        });

        // Properly map API response to Character type with all required fields
        const mappedCharacters: Character[] = (data.analysis.characters || []).map((char: any) => ({
          id: crypto.randomUUID(),
          name: char.name || 'Unknown Character',
          age: char.age || 0,
          description: char.description || '',
          aliases: char.aliases || '',
          locked: char.locked || false,
          detectionSource: char.detectionSource || 'ai-detected',
          // Additional fields from analysis
          relationships: char.relationships || [],
          emotionalArc: char.emotionalArc || '',
          firstMention: char.firstMention || 'line 1'
        }));

        // Auto-fill form fields
        setCharacters(mappedCharacters);
        
        // Join lines with proper line breaks
        const linesText = (data.analysis.lines || []).join('\n');
        setSplitLines(linesText);
        
        // Set analysis results for modal
        setAnalysisResults({
          charactersDetected: mappedCharacters.length,
          unnamedCharactersCreated: data.analysis.stats?.unnamedCharactersCreated || 0,
          linesGenerated: data.analysis.lines?.length || 0,
          storyTheme: data.analysis.theme || 'Not specified',
          tone: data.analysis.tone || 'Not specified',
          visualStyle: data.analysis.visualStyle || 'Not specified'
        });
        
        setTimeout(() => {
          if (!mountedRef.current) return;
          setIsAnalyzing(false);
          setShowAnalysisComplete(true);
        }, 500);
        
        toast({
          title: "✅ Analysis Complete!",
          description: `Detected ${mappedCharacters.length} characters and created ${data.analysis.lines?.length || 0} lines`,
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      
      if (!mountedRef.current) return;
      
      // Reset state on error
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setAnalysisCurrentTask("");
      setAnalysisSteps(steps => steps.map(s => ({ ...s, completed: false })));
      
      toast({
        title: "❌ Analysis Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  };

  // GENERATE PROMPTS HANDLER - FIXED VERSION
  const handleGenerate = () => {
    // Validation checks
    if (!fullContext.trim()) {
      toast({
        title: "Missing Full Script Context",
        description: "Please add your script in Full Script Context section",
        variant: "destructive"
      });
      return;
    }

    const lines = splitLines.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      toast({
        title: "Missing Split Lines",
        description: "Please add script lines in Split Script Lines section or use AI Analyse",
        variant: "destructive"
      });
      return;
    }

    if (!referenceStyle.trim()) {
      toast({
        title: "Missing Reference Style",
        description: "Please add a reference prompt style template",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting generation with:', {
      linesCount: lines.length,
      charactersCount: characters.length,
      promptLength,
      showNumbers,
      showScriptLines
    });

    // Reset and start generation
    setIsGenerating(true);
    setProgress(0);
    setGeneratedPrompts([]);
    setIsPaused(false);
    shouldContinueRef.current = true;
    generationAbortController.current = new AbortController();
    
    // Process lines sequentially
    processLines(lines);
  };

  // PROCESS LINES - FIXED VERSION WITH PROPER CANCELLATION
  const processLines = async (lines: string[]) => {
    const lockedChars = characters.filter(c => c.locked).map(c => c.name);
    let completedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      // FIRST: Check if cancelled
      if (!isGenerating || !shouldContinueRef.current || !mountedRef.current) {
        console.log('Generation cancelled at line', i + 1);
        break;
      }
      
      // SECOND: Check if paused (with cancellation check inside)
      while (isPaused) {
        if (!isGenerating || !shouldContinueRef.current || !mountedRef.current) {
          console.log('Generation cancelled while paused');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      try {
        console.log(`Processing line ${i + 1}/${lines.length}:`, lines[i].substring(0, 50) + '...');
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prompt`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              fullContext,
              referenceStyle,
              characters,
              lockedCharacters: lockedChars,
              sceneLine: lines[i],
              promptLength,
              lineNumber: i + 1,
              totalLines: lines.length
            }),
            signal: generationAbortController.current?.signal
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error ${response.status}:`, errorText);
          
          if (mountedRef.current) {
            toast({
              title: "⚠️ Generation Error",
              description: `Failed at line ${i + 1}: ${response.status}`,
              variant: "destructive"
            });
          }
          continue;
        }

        const data = await response.json();
        
        if (data.success && data.prompt) {
          const newPrompt: GeneratedPrompt = {
            id: crypto.randomUUID(),
            sceneLine: lines[i],
            generatedText: data.prompt,
            lineNumber: i + 1,
            characters: data.detectedCharacters || [],
            status: 'success'
          };
          
          if (mountedRef.current) {
            setGeneratedPrompts(prev => [...prev, newPrompt]);
            completedCount++;
            console.log(`✓ Generated prompt ${i + 1}/${lines.length}`);
          }
        } else {
          console.error('Generation failed:', data.error);
          
          // Add failed prompt placeholder
          const failedPrompt: GeneratedPrompt = {
            id: crypto.randomUUID(),
            sceneLine: lines[i],
            generatedText: `[Error: ${data.error || 'Generation failed'}]`,
            lineNumber: i + 1,
            characters: [],
            status: 'failed'
          };
          
          if (mountedRef.current) {
            setGeneratedPrompts(prev => [...prev, failedPrompt]);
            
            toast({
              title: "Generation Failed",
              description: data.error || `Failed at line ${i + 1}`,
              variant: "destructive"
            });
          }
        }
        
        // Update progress
        if (mountedRef.current) {
          const newProgress = ((i + 1) / lines.length) * 100;
          setProgress(newProgress);
        }
        
      } catch (error: any) {
        // Handle abort
        if (error.name === 'AbortError') {
          console.log('Generation aborted by user');
          break;
        }
        
        console.error('Error generating prompt:', error);
        
        if (mountedRef.current) {
          toast({
            title: "Network Error",
            description: "Failed to connect to generation service. Check your connection.",
            variant: "destructive"
          });
        }
      }
    }
    
    // Only show completion if naturally finished (not cancelled)
    if (isGenerating && shouldContinueRef.current && mountedRef.current) {
      setIsGenerating(false);
      setIsPaused(false);
      
      const failedCount = lines.length - completedCount;
      
      toast({
        title: "✅ Generation Complete!",
        description: `Successfully generated ${completedCount} prompts` + 
          (failedCount > 0 ? `. ${failedCount} failed.` : ''),
      });
    }
  };

  // PAUSE HANDLER
  const handlePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    toast({
      title: newPausedState ? "⏸️ Generation Paused" : "▶️ Generation Resumed",
      description: newPausedState 
        ? `Paused at ${Math.round(progress)}%` 
        : "Continuing generation..."
    });
  };

  // CANCEL HANDLER
  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  // CONFIRM CANCEL
  const confirmCancel = () => {
    // Stop generation immediately
    shouldContinueRef.current = false;
    setIsGenerating(false);
    setIsPaused(false);
    setShowCancelDialog(false);
    
    // Abort ongoing API call
    if (generationAbortController.current) {
      generationAbortController.current.abort();
    }
    
    const totalLines = splitLines.split('\n').filter(l => l.trim()).length;
    
    toast({
      title: "❌ Generation Cancelled",
      description: `Stopped at ${generatedPrompts.length}/${totalLines} prompts. Generated prompts are saved.`
    });
  };

  // Check if generate button should be disabled - only require split lines and reference style
  const isGenerateDisabled = 
    !splitLines.trim() || 
    splitLines.split('\n').filter(line => line.trim()).length === 0 ||
    !referenceStyle.trim();

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Left Sidebar */}
      <SidebarCharacters 
        characters={characters} 
        onChange={setCharacters} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-10 py-6 max-w-6xl space-y-6">
          {/* Mode Selector */}
          <ModeSelector mode={mode} onChange={setMode} />
          
          {/* Full Script Context Section */}
          <SectionWithToggle
            title="Full Script Context"
            lockKey="fullScriptContext_lockMode"
            dataKey="fullScriptContext_data"
            value={fullContext}
            onChange={setFullContext}
          >
            <FullScriptContext 
              value={fullContext} 
              onChange={setFullContext} 
            />
          </SectionWithToggle>

          {/* AI Analyse Button (Only in AI Advanced Mode) */}
          {mode === 'ai-advanced' && (
            <AIAnalyseButton 
              onClick={handleAIAnalyse}
              isAnalyzing={isAnalyzing}
              disabled={!fullContext.trim()}
            />
          )}

          {/* Split Script Lines Section */}
          <SectionWithToggle
            title="Split Script Lines (One Scene Per Line)"
            lockKey="splitScriptLines_lockMode"
            dataKey="splitScriptLines_data"
            value={splitLines}
            onChange={setSplitLines}
          >
            <SplitScriptLines 
              value={splitLines} 
              onChange={setSplitLines} 
            />
          </SectionWithToggle>

          {/* Reference Style Section */}
          <SectionWithToggle
            title="Reference Prompt Style (Style Template)"
            lockKey="referenceStyle_lockMode"
            dataKey="referenceStyle_data"
            value={referenceStyle}
            onChange={setReferenceStyle}
          >
            <ReferenceStyle 
              value={referenceStyle} 
              onChange={setReferenceStyle} 
            />
          </SectionWithToggle>

          {/* Prompt Length Selector */}
          <PromptLengthSelector 
            value={promptLength} 
            onChange={setPromptLength}
            showNumbers={showNumbers}
            onShowNumbersChange={setShowNumbers}
            showScriptLines={showScriptLines}
            onShowScriptLinesChange={setShowScriptLines}
          />
          
          {/* Progress Bar and Control Buttons (During Generation) */}
          {isGenerating && (
            <>
              <ProgressBar progress={progress} />
              <div className="flex justify-center gap-5 mt-6">
                <button
                  onClick={handlePause}
                  className="w-[150px] h-[52px] rounded-[26px] font-bold text-[15px] text-white transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  style={{
                    background: isPaused 
                      ? 'linear-gradient(135deg, #10B981, #059669)' 
                      : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    boxShadow: isPaused 
                      ? '0 4px 12px rgba(16, 185, 129, 0.4)' 
                      : '0 4px 12px rgba(59, 130, 246, 0.4)',
                  }}
                >
                  {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                <button
                  onClick={handleCancel}
                  className="w-[150px] h-[52px] rounded-[26px] font-bold text-[15px] border-2 bg-white hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  style={{
                    borderColor: '#EF4444',
                    color: '#EF4444',
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </>
          )}

          {/* Generate Button (When Not Generating) */}
          {!isGenerating && (
            <div className="flex flex-col items-center mt-6 mb-4">
              {isGenerateDisabled && (
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  {!splitLines.trim() ? '⚠️ Please add split script lines' : 
                   !referenceStyle.trim() ? '⚠️ Please add reference prompt style' : 
                   '⚠️ Please fill in all required fields'}
                </p>
              )}
              <GenerateButton 
                onClick={handleGenerate} 
                disabled={isGenerateDisabled} 
              />
            </div>
          )}

          {/* Download and Clear Buttons (When Prompts Exist) */}
          {generatedPrompts.length > 0 && (
            <>
              <DownloadClearButtons 
                prompts={generatedPrompts}
                onClear={() => {
                  setGeneratedPrompts([]);
                  setProgress(0);
                  toast({
                    title: "🗑️ Prompts Cleared",
                    description: "All generated prompts have been removed"
                  });
                }}
                showNumbers={showNumbers}
                showScriptLines={showScriptLines}
              />
              
              {/* Generated Prompts Display */}
              <GeneratedPrompts 
                prompts={generatedPrompts} 
                characters={characters}
                showNumbers={showNumbers}
                showScriptLines={showScriptLines}
              />
            </>
          )}
        </main>
        
        {/* AI Analysis Progress Modal */}
        <AnalysisProgressModal 
          isOpen={isAnalyzing} 
          steps={analysisSteps}
          progress={analysisProgress}
          currentTask={analysisCurrentTask}
          estimatedTime={analysisEstimatedTime}
        />
        
        {/* AI Analysis Complete Modal */}
        <AnalysisCompleteModal 
          isOpen={showAnalysisComplete}
          results={analysisResults}
          onClose={() => setShowAnalysisComplete(false)}
        />
        
        {/* Cancel Confirmation Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl p-6 shadow-2xl w-[420px] animate-in zoom-in duration-200">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Cancel Generation?
              </h3>
              <div className="space-y-3 mb-6">
                <p className="text-sm text-muted-foreground">
                  This will stop prompt generation at line <strong>{generatedPrompts.length}</strong> of{' '}
                  <strong>{splitLines.split('\n').filter(l => l.trim()).length}</strong>.
                </p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Generated prompts:</span>
                    <span className="font-semibold text-green-600">{generatedPrompts.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining prompts:</span>
                    <span className="font-semibold text-orange-600">
                      {splitLines.split('\n').filter(l => l.trim()).length - generatedPrompts.length}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  ℹ️ Generated prompts will be saved. You can continue later.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-6 py-2.5 rounded-full border-2 border-border text-sm font-semibold hover:bg-muted transition-all hover:scale-105 active:scale-95"
                >
                  Keep Generating
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-6 py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
