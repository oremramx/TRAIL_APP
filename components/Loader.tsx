
import React from 'react';

interface LoaderProps {
  text: string;
}

export const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800/80 rounded-lg">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <h3 className="mt-4 text-lg font-semibold text-gray-200">Generando Tu Plan</h3>
        <p className="mt-2 text-gray-400 max-w-md">{text}</p>
    </div>
  );
};
