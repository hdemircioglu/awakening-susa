
import React, { useState, useRef, useEffect } from 'react';
import type { StorySegment } from '../types';
import { UtopiaIcon, DystopiaIcon, SpeakerIcon, MovieIcon } from './Icons';
import Loader from './Loader';
import { decode, decodeAudioData } from '../utils/audio';

interface StoryDisplayProps {
  history: StorySegment[];
  onAnimate: (segmentId: string) => void;
}

const pathStyles = {
  utopia: {
    borderColor: 'border-cyan-400/30',
    iconColor: 'text-cyan-400',
    proseColor: 'prose-invert prose-p:text-gray-300',
  },
  dystopia: {
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-500',
    proseColor: 'prose-invert prose-p:text-gray-400',
  },
};

const StoryDisplay: React.FC<StoryDisplayProps> = ({ history, onAnimate }) => {
  const [activeAudioSegmentId, setActiveAudioSegmentId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playAudio = async (segmentId: string, base64: string) => {
    // Initialize AudioContext on first user interaction
    if (!audioContextRef.current) {
      // FIX: Cast window to `any` to allow access to `webkitAudioContext` for older browsers without a TypeScript error.
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const context = audioContextRef.current;

    // If another audio is playing, or the same audio is re-clicked, stop it.
    if (sourceRef.current) {
      sourceRef.current.onended = null;
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    
    // If it was a re-click on the playing audio, just stop and return.
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
        // Only clear active state if it's the one that just finished
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
  };


  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-12">
      {history.map((segment) => {
        const styles = pathStyles[segment.path];
        const isAudioPlaying = activeAudioSegmentId === segment.id;

        return (
          <div key={segment.id} className="animate-fade-in space-y-4">
            <div className={`relative pl-12 pr-6 py-6 bg-slate-800/50 rounded-lg border-l-4 ${styles.borderColor}`}>
              <div className={`absolute left-0 top-6 -translate-x-1/2 w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border-4 ${styles.borderColor}`}>
                {segment.path === 'utopia' ? (
                  <UtopiaIcon className={`w-6 h-6 ${styles.iconColor}`} />
                ) : (
                  <DystopiaIcon className={`w-6 h-6 ${styles.iconColor}`} />
                )}
              </div>
              <div className={`prose ${styles.proseColor} max-w-none`}>
                <p>{segment.result}</p>
              </div>
              {segment.storyAudioBase64 && (
                <button
                  onClick={() => playAudio(segment.id, segment.storyAudioBase64!)}
                  className={`absolute top-4 right-4 p-2 rounded-full ${styles.iconColor} ${isAudioPlaying ? 'bg-slate-600' : ''} hover:bg-slate-700/50 transition-colors`}
                  aria-label={isAudioPlaying ? "Stop narration" : "Play story narration"}
                >
                  <SpeakerIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
                {!segment.imageUrl ? (
                    <div className="aspect-video flex items-center justify-center bg-slate-900">
                        <Loader />
                    </div>
                ) : segment.animationUrl ? (
                    <video src={segment.animationUrl} className="w-full aspect-video" controls autoPlay loop />
                ) : (
                    <div className="relative group">
                        <img src={segment.imageUrl} alt={segment.imagePrompt} className="w-full aspect-video object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                           {segment.isAnimating ? (
                            <>
                                <div className="w-10 h-10 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                <p className="text-white mt-2 text-sm">Animating scene...</p>
                            </>
                           ) : segment.animationError ? (
                               <div className="text-center p-4">
                                   <p className="text-red-400 font-bold">Animation Failed</p>
                                   <p className="text-slate-300 text-sm mt-1">{segment.animationError}</p>
                               </div>
                           ) : (
                            <button
                                onClick={() => onAnimate(segment.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700/80 text-white rounded-full border border-slate-500 hover:bg-slate-600 transition-colors"
                            >
                                <MovieIcon className="w-5 h-5" />
                                Animate Scene
                            </button>
                           )}
                        </div>
                    </div>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StoryDisplay;
