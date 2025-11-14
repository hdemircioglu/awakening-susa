import React from 'react';
import type { StorySegment } from '../types';
import { UtopiaIcon, DystopiaIcon } from './Icons';

interface StoryDisplayProps {
  history: StorySegment[];
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

const StoryDisplay: React.FC<StoryDisplayProps> = ({ history }) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-8">
      {history.map((segment) => {
        const styles = pathStyles[segment.path];
        return (
          <div
            key={segment.id}
            className={`relative pl-12 pr-6 py-6 bg-slate-800/50 rounded-lg border-l-4 ${styles.borderColor} animate-fade-in`}
          >
            <div
              className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border-4 ${styles.borderColor}`}
            >
              {segment.path === 'utopia' ? (
                <UtopiaIcon className={`w-6 h-6 ${styles.iconColor}`} />
              ) : (
                <DystopiaIcon className={`w-6 h-6 ${styles.iconColor}`} />
              )}
            </div>
            <div className={`prose ${styles.proseColor} max-w-none`}>
              <p>{segment.result}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StoryDisplay;
