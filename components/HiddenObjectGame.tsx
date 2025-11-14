import React from 'react';
import type { HiddenObjectLocation } from '../types';

interface HiddenObjectGameProps {
  objectName: string;
  onAttempt: (location: HiddenObjectLocation) => void;
}

const gridLocations: HiddenObjectLocation[] = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
];

const HiddenObjectGame: React.FC<HiddenObjectGameProps> = ({ objectName, onAttempt }) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-end" aria-label="Hidden object game area">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 z-10">
            {gridLocations.map(location => (
                <button
                    key={location}
                    onClick={() => onAttempt(location)}
                    className="border border-white/0 hover:border-white/30 transition-all duration-200 focus:outline-none focus:border-cyan-400 focus:bg-cyan-500/20"
                    aria-label={`Search for object in the ${location.replace('-', ' ')} area`}
                />
            ))}
        </div>
        <div className="relative z-20 p-3 bg-gradient-to-t from-black/80 to-transparent text-center pointer-events-none">
            <p className="text-white font-semibold drop-shadow-lg">
                Find the: <span className="text-cyan-300">{objectName}</span>
            </p>
        </div>
    </div>
  );
};

export default HiddenObjectGame;