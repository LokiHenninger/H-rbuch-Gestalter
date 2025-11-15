import React from 'react';

interface VoiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice: (voice: string) => void;
  onTestVoice: (voice: string) => void;
  currentVoice: string;
  testingVoice: string | null;
  maleVoices: string[];
  femaleVoices: string[];
}

export const VoiceSelectionModal: React.FC<VoiceSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectVoice,
  onTestVoice,
  currentVoice,
  testingVoice,
  maleVoices,
  femaleVoices,
}) => {
  if (!isOpen) return null;

  const renderVoiceList = (voices: string[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {voices.map((voice) => {
        const isCurrent = voice === currentVoice;
        const isTesting = testingVoice === voice;
        return (
          <div
            key={voice}
            className={`p-2 rounded-lg flex flex-col items-center justify-center text-center transition-colors duration-200 ${
              isCurrent ? 'bg-indigo-900 border border-indigo-500' : 'bg-gray-700 border border-gray-600'
            }`}
          >
            <span className="font-mono text-sm mb-2">{voice}</span>
            <div className="flex items-center gap-1 w-full">
                <button
                    onClick={() => onTestVoice(voice)}
                    disabled={!!testingVoice}
                    className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-md disabled:bg-gray-800 disabled:text-gray-500 transition-colors w-1/2 flex justify-center"
                    aria-label={`Stimme ${voice} testen`}
                >
                 {isTesting ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                       <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                 )}
                </button>
                <button
                    onClick={() => onSelectVoice(voice)}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md font-semibold text-xs transition-colors w-1/2"
                >
                    Wählen
                </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col p-6 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-100">Stimme auswählen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto pr-2 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-2 capitalize">Weibliche Stimmen</h3>
            <div className="mt-2 p-2 rounded-lg min-h-[80px]">
                {renderVoiceList(femaleVoices)}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-2 capitalize">Männliche Stimmen</h3>
             <div className="mt-2 p-2 rounded-lg min-h-[80px]">
                {renderVoiceList(maleVoices)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};