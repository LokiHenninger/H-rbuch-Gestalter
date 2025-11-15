
import React, { useState, useEffect } from 'react';

interface AnalysisLoadingModalProps {
  isOpen: boolean;
}

const STEPS = [
  'Lese das Buch...',
  'Identifiziere Charaktere...',
  'Extrahiere Dialoge...',
  'Analysiere die Stimmung...',
  'Suche nach Atmosphären...',
  'Stelle die Ergebnisse zusammen...',
];

export const AnalysisLoadingModal: React.FC<AnalysisLoadingModalProps> = ({ isOpen }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0); // Reset on open
      const interval = setInterval(() => {
        setCurrentStep(prevStep => (prevStep + 1) % STEPS.length);
      }, 2500); // Change step every 2.5 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-50 fade-in backdrop-blur-sm">
      <div className="text-center p-8">
        <svg 
          className="animate-spin h-12 w-12 text-indigo-400 mx-auto" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          ></circle>
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <h2 className="mt-6 text-2xl font-bold text-white">
          AI-Assistent arbeitet...
        </h2>
        <p className="mt-2 text-lg text-gray-300 transition-opacity duration-500">
          {STEPS[currentStep]}
        </p>
      </div>
    </div>
  );
};
