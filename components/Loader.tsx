
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 border-4 border-t-transparent border-blue-400 rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-400">The world is changing...</p>
    </div>
  );
};

export default Loader;
