
import React from 'react';

interface AudioPlayerProps {
  src: string;
  title: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title }) => {

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    
    // Bereinigen Sie den Titel, um einen sicheren Dateinamen zu erstellen
    const safeFilename = title.trim().replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_') || 'hoerbuch';
    
    link.download = `${safeFilename}.mp3`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="w-full bg-gray-800 p-4 rounded-xl shadow-2xl fade-in">
        <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Ihr generiertes Hörbuch</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <audio controls src={src} className="w-full flex-grow">
          Your browser does not support the audio element.
        </audio>
        <button
          onClick={handleDownload}
          className="flex-shrink-0 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
          title={`"${title}.mp3" herunterladen`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Herunterladen
        </button>
      </div>
    </div>
  );
};
