import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StorySegment, PathType, StoryChoice, HiddenObjectLocation } from './types';
import { 
    generateStorySegment,
    generateImage,
    generateSpeech,
} from './services/geminiService';
import StoryDisplay from './components/StoryDisplay';
import Loader from './components/Loader';
import HiddenObjectGame from './components/HiddenObjectGame';
import { decode, decodeAudioData } from './utils/audio';

const INITIAL_WORLD_SUMMARY = "The world is a blank canvas, poised at a crucial turning point. The future is unwritten.";

const App: React.FC = () => {
  const [storyHistory, setStoryHistory] = useState<StorySegment[]>([]);
  const [currentWorldSummary, setCurrentWorldSummary] = useState<string>(INITIAL_WORLD_SUMMARY);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentChoices, setCurrentChoices] = useState<StoryChoice>({ a: '', b: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAudioSegmentId, setActiveAudioSegmentId] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  useEffect(() => {
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
    setCurrentQuestion('');

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
            hiddenObjectName: textResponse.hiddenObjectName,
            hiddenObjectLocation: textResponse.hiddenObjectLocation,
            isObjectFound: false,
            nextQuestion: textResponse.newQuestion,
            nextChoices: { a: textResponse.choiceA, b: textResponse.choiceB },
        };
        
        setStoryHistory(prev => [...prev, newSegment]);
        
        const [imageBase64, storyAudioBase64] = await Promise.all([
            generateImage(textResponse.imageGenerationPrompt),
            generateSpeech(textResponse.speechNarrationStory),
        ]);
        
        const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

        setStoryHistory(prev => prev.map(seg => 
            seg.id === newSegment.id 
            ? { ...seg, imageUrl, storyAudioBase64 }
            : seg
        ));
        
        setIsLoading(false);
        
        playAudio(newSegment.id, storyAudioBase64);

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setIsLoading(false);
    }
  };
  
  const handleFindAttempt = (segmentId: string, location: HiddenObjectLocation) => {
    const segmentIndex = storyHistory.findIndex(s => s.id === segmentId);
    const segment = storyHistory[segmentIndex];

    if (!segment || segment.isObjectFound) return;

    if (location === segment.hiddenObjectLocation) {
      const newHistory = storyHistory.map(s => 
        s.id === segmentId ? { ...s, isObjectFound: true } : s
      );
      setStoryHistory(newHistory);

      // If the found object is in the latest story segment, reveal the next question.
      if (segmentIndex === newHistory.length - 1) {
        const updatedSegment = newHistory[segmentIndex];
        // A short delay to let the user appreciate finding the object.
        setTimeout(() => {
          setCurrentQuestion(updatedSegment.nextQuestion);
          setCurrentChoices(updatedSegment.nextChoices);
        }, 1500);
      }
    }
  };

  const renderHiddenObjectGame = (segment: StorySegment) => {
    if (!segment.hiddenObjectName || !segment.imageUrl) {
      return null;
    }
    
    if (segment.isObjectFound) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="text-center p-4 bg-green-900/80 border-2 border-green-500 rounded-lg shadow-2xl">
            <p className="text-green-200 text-lg font-bold">Object Found!</p>
            <p className="text-green-300">{segment.hiddenObjectName}</p>
          </div>
        </div>
      );
    }

    return (
      <HiddenObjectGame
        objectName={segment.hiddenObjectName}
        onAttempt={(location) => handleFindAttempt(segment.id, location)}
      />
    );
  };
  
  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8 font-sans">
      <header className="text-center mb-8 w-full max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-500 mb-2">
          Utopia / Dystopia
        </h1>
        <p className="text-slate-400">A hidden object branching narrative</p>
      </header>

      <StoryDisplay 
        history={storyHistory} 
        playAudio={playAudio}
        activeAudioSegmentId={activeAudioSegmentId}
        renderHiddenObjectGame={renderHiddenObjectGame}
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