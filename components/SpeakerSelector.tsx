import React from 'react';
import type { Speaker, SpeakerSettings } from '../types';
import { MOODS, SPEEDS, MALE_VOICES, FEMALE_VOICES } from '../constants';
import { hexToRgba } from '../utils';

interface SpeakerSelectorProps {
  speakers: Speaker[];
  speakerColors: { [key: string]: string };
  onAssignSpeaker: (speakerId: string) => void;
  selectionActive: boolean;
  speakerSettings: SpeakerSettings;
  onSpeakerSettingsChange: (speakerId: string, setting: Partial<SpeakerSettings[string]>) => void;
  onAddSpeaker: () => void;
  onDeleteSpeaker: (speakerId: string) => void;
  onSpeakerVoiceChange: (speakerId: string, voice: string) => void;
  onSpeakerNameChange: (speakerId: string, newName: string) => void;
  onSpeakerColorChange: (speakerId: string, newColor: string) => void;
  onTestSpeaker: (speaker: Speaker) => void;
  testingSpeakerId: string | null;
  onSaveSettings: () => void;
  onLoadSettings: () => void;
}

export const SpeakerSelector: React.FC<SpeakerSelectorProps> = ({ 
  speakers,
  speakerColors, 
  onAssignSpeaker, 
  selectionActive,
  speakerSettings,
  onSpeakerSettingsChange,
  onAddSpeaker,
  onDeleteSpeaker,
  onSpeakerVoiceChange,
  onSpeakerNameChange,
  onSpeakerColorChange,
  onTestSpeaker,
  testingSpeakerId,
  onSaveSettings,
  onLoadSettings,
}) => {
  const selectStyles = "w-full bg-gray-600 text-gray-200 border border-gray-500 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition";
  const buttonBaseStyles = "w-full text-center py-1.5 rounded-md transition-colors duration-200 ease-in-out disabled:cursor-not-allowed font-semibold text-sm";


  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
         <h2 className="text-xl font-semibold text-gray-300">Sprecher anpassen</h2>
         <div className="flex items-center gap-3">
            <button onClick={onSaveSettings} title="Einstellungen speichern" className="text-gray-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <button onClick={onLoadSettings} title="Einstellungen laden" className="text-gray-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
            </button>
        </div>
      </div>

      {!selectionActive && (
        <div className="text-center text-gray-500 text-sm p-3 border-2 border-dashed border-gray-600 rounded-lg mb-2">
          Text markieren, um Sprecher zuzuweisen.
        </div>
      )}

      <div className="space-y-2 overflow-y-auto pr-1 flex-grow">
        {speakers.map((speaker, index) => {
          const settings = speakerSettings[speaker.id] || { mood: 'normal', speed: 'normal' };
          const hexColor = speakerColors[speaker.id] || '#FFFFFF';
          const isTesting = testingSpeakerId === speaker.id;

          return (
            <div
              key={speaker.id}
              className="w-full text-left p-2 rounded-lg relative transition-all duration-200 ease-in-out"
              style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${hexToRgba(hexColor, 0.5)}`
              }}
            >
              {index > 0 && (
                <button 
                  onClick={() => onDeleteSpeaker(speaker.id)}
                  className="absolute top-1 right-1 text-gray-500 hover:text-red-400 transition-colors z-10"
                  title="Sprecher löschen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <div className="flex items-center gap-2 mb-2">
                 {index < 9 ? (
                    <div className="w-4 text-center text-xs text-gray-500 font-mono flex-shrink-0 select-none" title={`Num-Pad ${index + 1}`}>
                        {index + 1}
                    </div>
                ) : (
                    <div className="w-4 flex-shrink-0" /> // Placeholder for alignment
                )}
                 <div className="relative w-4 h-4 rounded-full flex-shrink-0">
                    <input
                      type="color"
                      value={hexColor}
                      onChange={(e) => onSpeakerColorChange(speaker.id, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Farbe auswählen"
                      title="Farbe ändern"
                      disabled={index === 0}
                    />
                    <div
                      className="w-full h-full rounded-full border border-gray-500"
                      style={{ backgroundColor: hexColor }}
                    />
                  </div>
                <input 
                  type="text"
                  value={speaker.displayName}
                  onChange={(e) => onSpeakerNameChange(speaker.id, e.target.value)}
                  disabled={index === 0}
                  className="font-medium text-sm bg-transparent focus:bg-gray-700 rounded px-1 -ml-1 py-0 outline-none w-full disabled:cursor-default"
                  aria-label="Sprechername"
                />
                <span className="text-xs text-gray-500 flex-shrink-0">({speaker.voice})</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-2">
                 <div>
                   <select 
                    id={`voice-${speaker.id}`}
                    value={speaker.voice}
                    onChange={(e) => onSpeakerVoiceChange(speaker.id, e.target.value)}
                    className={selectStyles}
                   >
                     <optgroup label="Männlich">
                        {MALE_VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                     </optgroup>
                     <optgroup label="Weiblich">
                        {FEMALE_VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                     </optgroup>
                   </select>
                </div>
                 <div>
                   <select 
                    id={`mood-${speaker.id}`}
                    value={settings.mood}
                    onChange={(e) => onSpeakerSettingsChange(speaker.id, { mood: e.target.value as any })}
                    className={selectStyles}
                   >
                     {MOODS.map(mood => <option key={mood.value} value={mood.value}>{mood.label}</option>)}
                   </select>
                </div>
                 <div>
                   <select 
                    id={`speed-${speaker.id}`}
                    value={settings.speed}
                    onChange={(e) => onSpeakerSettingsChange(speaker.id, { speed: e.target.value as any })}
                    className={selectStyles}
                   >
                     {SPEEDS.map(speed => <option key={speed.value} value={speed.value}>{speed.label}</option>)}
                   </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => onTestSpeaker(speaker)}
                  disabled={isTesting}
                  className={`${buttonBaseStyles} col-span-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500`}
                >
                  {isTesting ? '...' : 'Test'}
                </button>
                <button
                  onClick={() => onAssignSpeaker(speaker.id)}
                  disabled={!selectionActive}
                  className={`${buttonBaseStyles} col-span-2 disabled:bg-gray-700 disabled:text-gray-500`}
                  style={{ 
                      backgroundColor: selectionActive ? hexToRgba(hexColor, 0.4) : 'rgba(255,255,255,0.1)',
                      color: selectionActive ? 'white' : '#A0AEC0'
                  }}
                >
                  Zuweisen
                </button>
              </div>
            </div>
        )})}
      </div>
      <div className="mt-3">
        <button
          onClick={onAddSpeaker}
          className="w-full bg-gray-700 hover:bg-gray-600 text-indigo-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Neuen Sprecher hinzufügen
        </button>
      </div>
    </div>
  );
};