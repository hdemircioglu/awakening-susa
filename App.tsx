import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StorySegment, PathType, StoryChoice } from './types';
import { generateStorySegment } from './services/geminiService';
import StoryDisplay from './components/StoryDisplay';
import Loader from './components/Loader';

const INITIAL_WORLD_SUMMARY = "The world is a blank canvas, poised at a crucial turning point. The future is unwritten.";

const App: React.FC = () => {
  const [storyHistory, setStoryHistory] = useState<StorySegment[]>([]);
  const [currentWorldSummary, setCurrentWorldSummary] = useState<string>(INITIAL_WORLD_SUMMARY);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentChoices, setCurrentChoices] = useState<StoryChoice>({ a: '', b: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setStoryHistory([]);
    setCurrentWorldSummary(INITIAL_WORLD_SUMMARY);
    generateStorySegment(INITIAL_WORLD_SUMMARY, null, 'utopia')
        .then(response => {
            setCurrentWorldSummary(response.newWorldSummary);
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
  }, [storyHistory, isLoading]);
  
  const handleChoice = (choice: 'A' | 'B') => {
    const fullChoiceText = choice === 'A' ? currentChoices.a : currentChoices.b;
    setIsLoading(true);
    setError(null);

    const lastPath = storyHistory.length > 0 ? storyHistory[storyHistory.length - 1].path : 'dystopia';
    const pathType: PathType = lastPath === 'utopia' ? 'dystopia' : 'utopia';

    generateStorySegment(currentWorldSummary, fullChoiceText, pathType)
        .then(response => {
            const newSegment: StorySegment = {
                id: `seg-${storyHistory.length}`,
                result: response.storyResult,
                question: currentQuestion,
                choices: currentChoices,
                path: pathType,
            };

            setStoryHistory(prev => [...prev, newSegment]);
            setCurrentWorldSummary(response.newWorldSummary);
            setCurrentQuestion(response.newQuestion);
            setCurrentChoices({ a: response.choiceA, b: response.choiceB });
        })
        .catch(err => {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        })
        .finally(() => {
            setIsLoading(false);
        });
  };
  
  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8 font-sans">
      <header className="text-center mb-8 w-full max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-500 mb-2">
          Utopia / Dystopia
        </h1>
        <p className="text-slate-400">An AI-powered branching narrative</p>
      </header>

      <StoryDisplay history={storyHistory} />
      
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
