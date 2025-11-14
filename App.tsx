import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StorySegment, PathType, StoryChoice } from './types';
import { 
    generateStorySegment,
    generateImage,
    generateSpeech,
    generateAnimation,
    checkAnimationStatus,
    fetchVideo,
} from './services/geminiService';
import StoryDisplay from './components/StoryDisplay';
import Loader from './components/Loader';
import { decode, decodeAudioData } from './utils/audio';

// FIX: To resolve the type conflict for `window.aistudio`, we augment the `AIStudio`
// interface instead of re-declaring `aistudio` on `Window`. This relies on
// `window.aistudio` being typed as `AIStudio` in another global declaration.
declare global {
    interface AIStudio {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    }
}

const INITIAL_WORLD_SUMMARY = "The world is a blank canvas, poised at a crucial turning point. The future is unwritten.";

const App: React.FC = () => {
  const [storyHistory, setStoryHistory] = useState<StorySegment[]>([]);
  const [currentWorldSummary, setCurrentWorldSummary] = useState<string>(INITIAL_WORLD_SUMMARY);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentChoices, setCurrentChoices] = useState<StoryChoice>({ a: '', b: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [activeAudioSegmentId, setActiveAudioSegmentId] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const keySelected = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(keySelected);
        } else {
            setHasApiKey(false); 
        }
    };
    checkKey();
  }, []);
  
  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
    }
  };

  useEffect(() => {
    // Cleanup audio resources on component unmount
    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playAudio = useCallback(async (segmentId: string, base64: string) => {
    if (!audioContextRef.current) {
        // FIX: Cast window to `any` to allow access to `webkitAudioContext` for older browsers without a TypeScript error.
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const context = audioContextRef.current;

    if (context.state === 'suspended') {
      await context.resume();
    }

    if (sourceRef.current) {
      sourceRef.current.onended = null;
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    
    if (activeAudioSegmentId === segmentId) {
      setActiveAudioSegmentId(null);
      return;
    }

    try {
      setActiveAudioSegmentId(segmentId);
      const audioData = decode(base64);
      const audioBuffer = await decodeAudioData(audioData, context, 24000, 1);
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      source.onended = () => {
        if (activeAudioSegmentId === segmentId) {
          setActiveAudioSegmentId(null);
        }
        sourceRef.current = null;
      };
      source.start();
      sourceRef.current = source;
    } catch (e) {
      console.error("Error playing audio:", e);
      setActiveAudioSegmentId(null);
    }
  }, [activeAudioSegmentId]);

  const startGame = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setStoryHistory([]);
    setCurrentWorldSummary(INITIAL_WORLD_SUMMARY);
    generateStorySegment(INITIAL_WORLD_SUMMARY, null, 'utopia')
        .then(response => {
            setCurrentWorldSummary(INITIAL_WORLD_SUMMARY);
            setCurrentQuestion(response.newQuestion);
            setCurrentChoices({ a: response.choiceA, b: response.choiceB });
        })
        .catch(err => {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        })
        .finally(() => {
            setIsLoading(false);
        });
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyHistory, isLoading, currentQuestion]);
  
  const handleChoice = async (choice: 'A' | 'B') => {
    const fullChoiceText = choice === 'A' ? currentChoices.a : currentChoices.b;
    setIsLoading(true);
    setError(null);

    const lastPath = storyHistory.length > 0 ? storyHistory[storyHistory.length - 1].path : 'dystopia';
    const pathType: PathType = lastPath === 'utopia' ? 'dystopia' : 'utopia';

    try {
        const textResponse = await generateStorySegment(currentWorldSummary, fullChoiceText, pathType);

        const newSegment: StorySegment = {
            id: `seg-${storyHistory.length}`,
            result: textResponse.storyResult,
            question: currentQuestion,
            choices: currentChoices,
            path: pathType,
            imagePrompt: textResponse.imageGenerationPrompt,
            animationDescription: textResponse.animationDescription,
        };
        
        setStoryHistory(prev => [...prev, newSegment]);
        setCurrentQuestion(textResponse.newQuestion);
        setCurrentChoices({ a: textResponse.choiceA, b: textResponse.choiceB });
        setIsLoading(false);

        const [imageBase64, storyAudioBase64] = await Promise.all([
            generateImage(textResponse.imageGenerationPrompt),
            generateSpeech(textResponse.speechNarrationStory),
        ]);
        
        // Auto-play the generated audio
        playAudio(newSegment.id, storyAudioBase64);

        const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

        setStoryHistory(prev => prev.map(seg => 
            seg.id === newSegment.id 
            ? { ...seg, imageUrl, storyAudioBase64, imageBase64 }
            : seg
        ));

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setIsLoading(false);
    }
  };

  const handleAnimate = async (segmentId: string) => {
    if (!hasApiKey) {
        handleSelectKey();
        return;
    }
    const segment = storyHistory.find(s => s.id === segmentId);
    if (!segment || !segment.imageBase64) return;
    
    setStoryHistory(prev => prev.map(s => s.id === segmentId ? { ...s, isAnimating: true, animationError: undefined } : s));

    try {
        let operation = await generateAnimation(segment.imageBase64, segment.animationDescription);
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await checkAnimationStatus(operation);
        }

        if (operation.error) throw new Error(operation.error.message || "Animation failed in processing.");
        
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("Animation finished but no video URI was returned.");
        
        const videoBlob = await fetchVideo(videoUri);
        const animationUrl = URL.createObjectURL(videoBlob);
        
        setStoryHistory(prev => prev.map(s => s.id === segmentId ? { ...s, isAnimating: false, animationUrl } : s));

    } catch (error) {
        // FIX: Safely handle the error object, which is of type 'unknown' in a catch block.
        // This prevents a type error when trying to use the error object directly.
        const errorMessage = error instanceof Error ? error.message : String(error);
        setStoryHistory(prev => prev.map(s => s.id === segmentId ? { ...s, isAnimating: false, animationError: errorMessage } : s));
        if (errorMessage.includes("API key not found")) setHasApiKey(false);
    }
  };
  
  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8 font-sans">
      <header className="text-center mb-8 w-full max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-500 mb-2">
          Utopia / Dystopia
        </h1>
        <p className="text-slate-400">An AI-powered branching narrative</p>
        {hasApiKey === false && (
            <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700 text-sm">
                <p className="text-slate-300">Enable video animation by selecting a Google AI Studio API key.</p>
                <p className="text-slate-400 text-xs mt-1">Video generation is a billable feature. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">Learn more</a>.</p>
                <button onClick={handleSelectKey} className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold transition-colors">
                    Select API Key
                </button>
            </div>
        )}
      </header>

      <StoryDisplay 
        history={storyHistory} 
        onAnimate={handleAnimate}
        playAudio={playAudio}
        activeAudioSegmentId={activeAudioSegmentId}
      />
      
      <div className="w-full max-w-3xl mx-auto px-4 mt-8">
        {isLoading && <Loader />}
        
        {error && (
          <div className="text-center p-6 bg-red-900/50 border border-red-500/50 rounded-lg animate-fade-in">
            <p className="text-red-400 font-semibold">A Tear in Reality</p>
            <p className="text-slate-300 mt-2">{error}</p>
            <button
              onClick={startGame}
              className="mt-4 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
            >
              Restart Story
            </button>
          </div>
        )}

        {!isLoading && !error && currentQuestion && (
          <div className="text-center p-6 bg-slate-800/50 rounded-lg border border-slate-700 animate-fade-in">
            <p className="text-xl text-slate-300 italic mb-6">{currentQuestion}</p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <ChoiceButton choice="A" text={currentChoices.a} onClick={handleChoice} />
              <ChoiceButton choice="B" text={currentChoices.b} onClick={handleChoice} />
            </div>
          </div>
        )}
      </div>

      {storyHistory.length > 0 && !isLoading && (
         <button
            onClick={startGame}
            className="mt-12 px-6 py-2 text-slate-400 border border-slate-600 rounded-full hover:bg-slate-700 hover:text-white transition-all"
          >
            Start a New Reality
          </button>
      )}

      <div ref={bottomRef} />
    </main>
  );
};

interface ChoiceButtonProps {
    choice: 'A' | 'B';
    text: string;
    onClick: (choice: 'A' | 'B') => void;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ choice, text, onClick }) => (
    <button 
        onClick={() => onClick(choice)}
        className="group relative w-full md:w-auto flex-1 p-4 border-2 border-slate-600 rounded-lg text-left hover:bg-slate-700/50 hover:border-slate-500 transition-all duration-300"
    >
        <span className="absolute -left-3 -top-3 flex items-center justify-center w-8 h-8 bg-slate-800 border-2 border-slate-600 rounded-full text-slate-400 font-bold group-hover:bg-slate-700 group-hover:border-slate-500 transition-all duration-300">
            {choice}
        </span>
        <span className="text-slate-200">{text}</span>
    </button>
);

export default App;