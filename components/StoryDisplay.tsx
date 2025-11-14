import React from 'react';
import type { StorySegment } from '../types';
import { UtopiaIcon, DystopiaIcon, SpeakerIcon } from './Icons';
import Loader from './Loader';

interface StoryDisplayProps {
  history: StorySegment[];
  playAudio: (segmentId: string, base64: string) => void;
  activeAudioSegmentId: string | null;
  renderHiddenObjectGame: (segment: StorySegment) => React.ReactNode;
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

const StoryDisplay: React.FC<StoryDisplayProps> = ({ history, playAudio, activeAudioSegmentId, renderHiddenObjectGame }) => {

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
                  <SpeakerIcon className={`w-5 h-5 ${isAudioPlaying ? 'animate-glow' : ''}`} />
                </button>
              )}
            </div>

            <div className="relative bg-slate-800/50 rounded-lg p-2 md:p-4 border border-slate-700/50">
                {!segment.imageUrl ? (
                    <div className="aspect-video flex items-center justify-center bg-slate-900 rounded-md">
                        <Loader />
                    </div>
                ) : (
                    <div className="relative aspect-video rounded-md overflow-hidden bg-slate-900">
                        <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${segment.imageUrl})` }}
                            aria-label="Scene image"
                        >
                        </div>
                         {renderHiddenObjectGame(segment)}
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