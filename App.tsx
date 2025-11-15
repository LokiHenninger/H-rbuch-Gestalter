import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { HighlightingTextarea } from './components/HighlightingTextarea';
import { SpeakerSelector } from './components/SpeakerSelector';
import { AudioPlayer } from './components/AudioPlayer';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AnalysisLoadingModal } from './components/AnalysisLoadingModal';
import { INITIAL_SPEAKERS, INITIAL_SPEAKER_COLORS, ALL_AVAILABLE_VOICES, MALE_VOICES, FEMALE_VOICES } from './constants';
import type { Assignment, Selection, Speaker, SpeakerSetting, SpeakerSettings, SavedSettings, ProjectData, AtmosphereSuggestion, Mood } from './types';
import { generateAudiobook, testSpeakerVoice, testVoice, analyzeBookWithAI } from './services/geminiService';

// Deklarieren der globalen Bibliotheken, die über Skript-Tags importiert werden
declare const pdfjsLib: any;

const CHAR_LIMIT = 300000;
const RECOMMENDED_CHAR_LIMIT = 100000;
const PROJECT_FILE_VERSION = 2; // Version bump for atmosphere suggestions

const App: React.FC = () => {
  const [text, setText] = useState<string>('Fügen Sie hier Ihren Buchtext ein oder laden Sie eine Datei (.txt, .pdf). Markieren Sie dann einen Abschnitt und wählen Sie rechts einen Sprecher aus, um ihn zuzuweisen.');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [atmosphereSuggestions, setAtmosphereSuggestions] = useState<AtmosphereSuggestion[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Mein Hörbuch');
  
  const [speakers, setSpeakers] = useState<Speaker[]>(INITIAL_SPEAKERS);
  const [speakerColors, setSpeakerColors] = useState<{ [key: string]: string }>(INITIAL_SPEAKER_COLORS);
  const [testingSpeakerId, setTestingSpeakerId] = useState<string | null>(null);
  const [testingRawVoice, setTestingRawVoice] = useState<string | null>(null);
  const [audioQuality, setAudioQuality] = useState<number>(320);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const testAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const settingsFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const testAudioCache = useRef<Map<string, AudioBuffer>>(new Map());

  const initialSettings = speakers.reduce((acc, speaker) => {
    if (speaker.id === 'spk_1') { // Erzähler ID
      acc[speaker.id] = { mood: 'normal', speed: 'schnell' };
    } else {
      acc[speaker.id] = { mood: 'normal', speed: 'normal' };
    }
    return acc;
  }, {} as SpeakerSettings);

  const [speakerSettings, setSpeakerSettings] = useState<SpeakerSettings>(initialSettings);
  
  useEffect(() => {
    // Configure PDF.js worker once on component mount
    if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
    }
  }, []);

  const handleSpeakerSettingsChange = (speakerId: string, setting: Partial<SpeakerSetting>) => {
    setSpeakerSettings(prev => ({
        ...prev,
        [speakerId]: {
            ...prev[speakerId],
            ...setting,
        }
    }));
  };
  
  const handleAddSpeaker = () => {
    const newSpeakerId = `spk_${Date.now()}`;
    const nextSpeakerIndex = speakers.length; 
    const newVoice = ALL_AVAILABLE_VOICES[nextSpeakerIndex % ALL_AVAILABLE_VOICES.length];
    
    const usedLetters = new Set(speakers.map(s => s.name.match(/^Stimme ([A-Z])/)?.[1]).filter(Boolean));
    let nextLetter = 'A';
    while(usedLetters.has(nextLetter)) {
        nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
    }
    const newSpeakerName = `Stimme ${nextLetter}`;

    const newSpeaker: Speaker = {
      id: newSpeakerId,
      name: newSpeakerName,
      displayName: newSpeakerName,
      voice: newVoice,
    };
    
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

    setSpeakers(prev => [...prev, newSpeaker]);
    setSpeakerColors(prev => ({ ...prev, [newSpeakerId]: randomColor }));
    setSpeakerSettings(prev => ({ ...prev, [newSpeakerId]: { mood: 'normal', speed: 'normal' } }));
  };
  
  const handleDeleteSpeaker = (speakerIdToDelete: string) => {
    if (speakerIdToDelete === speakers[0]?.id) return;
    
    setAssignments(prev => prev.filter(a => a.speakerId !== speakerIdToDelete));
    setSpeakers(prev => prev.filter(s => s.id !== speakerIdToDelete));
    
    setSpeakerColors(prev => {
      const next = {...prev};
      delete next[speakerIdToDelete];
      return next;
    });
    setSpeakerSettings(prev => {
       const next = {...prev};
      delete next[speakerIdToDelete];
      return next;
    });
  };
  
  const handleSpeakerVoiceChange = (speakerId: string, newVoice: string) => {
    setSpeakers(prev => prev.map(s => 
      s.id === speakerId ? { ...s, voice: newVoice } : s
    ));
  };
  
  const handleSpeakerNameChange = (speakerId: string, newDisplayName: string) => {
    setSpeakers(prev => prev.map(s =>
      s.id === speakerId ? { ...s, displayName: newDisplayName } : s
    ));
  };

  const handleSpeakerColorChange = (speakerId: string, newColor: string) => {
    setSpeakerColors(prev => ({ ...prev, [speakerId]: newColor }));
  };

  const handleAssignSpeaker = useCallback((speakerId: string) => {
    if (!selection || selection.start === selection.end) return;
    
    const settings = speakerSettings[speakerId];

    const newAssignment: Assignment = {
      id: Date.now(),
      start: selection.start,
      end: selection.end,
      speakerId,
      mood: settings.mood,
      speed: settings.speed,
    };

    const filteredAssignments = assignments.filter(
      (ass) => !(ass.start >= newAssignment.start && ass.end <= newAssignment.end)
    );

    setAssignments([...filteredAssignments, newAssignment]);
  }, [selection, assignments, speakerSettings]);
  
   useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const match = event.code.match(/^Numpad(\d)$/);
      if (!match) return;

      const num = parseInt(match[1], 10);
      if (num < 1 || num > 9) return;
      if (!selection || selection.start === selection.end) return;
      
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
         if ((activeElement as HTMLElement).id !== 'main-textarea') return;
      }

      event.preventDefault();
      
      const speakerIndex = num - 1;
      if (speakers[speakerIndex]) {
        handleAssignSpeaker(speakers[speakerIndex].id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection, speakers, handleAssignSpeaker]);


  // Helper function to decode raw PCM data into an AudioBuffer for playback.
  const pcmToAudioBuffer = (data: Uint8Array, ctx: AudioContext): AudioBuffer => {
      const sampleRate = 24000; // Gemini TTS sample rate is 24kHz
      const numChannels = 1; // mono
      // The raw data is 16-bit PCM, so we create an Int16Array view on the buffer
      const pcm16 = new Int16Array(data.buffer);
      const frameCount = pcm16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
          // Convert 16-bit integer to a float between -1.0 and 1.0
          channelData[i] = pcm16[i] / 32768.0;
      }
      return buffer;
  };

  const handleTestSpeaker = async (speaker: Speaker) => {
    // Stop any currently playing test audio source
    if (testAudioSourceRef.current) {
        try {
            testAudioSourceRef.current.stop();
        } catch (e) {
            // It might have already stopped, which can throw an error. Ignore it.
        }
        testAudioSourceRef.current.disconnect();
        testAudioSourceRef.current = null;
    }

    // Initialize AudioContext on the first user interaction
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            setError('Ihr Browser unterstützt die Web Audio API nicht, die für die Audiowiedergabe benötigt wird.');
            return;
        }
    }
    const audioContext = audioContextRef.current;
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    setTestingSpeakerId(speaker.id);
    setError(null);
    try {
        const settings = speakerSettings[speaker.id];
        if (!speaker || !settings) return;

        // Fetch raw PCM audio data, skipping slow client-side MP3 encoding
        const pcmBytes = await testSpeakerVoice(speaker, settings);
        
        if (pcmBytes.length === 0) {
           throw new Error('Die API hat keine Audiodaten zurückgegeben.');
        }

        // Decode the raw data into an AudioBuffer that can be played
        const audioBuffer = pcmToAudioBuffer(pcmBytes, audioContext);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

        source.onended = () => {
            if (testAudioSourceRef.current === source) {
                testAudioSourceRef.current = null;
            }
        };
        
        testAudioSourceRef.current = source;

    } catch (err) {
        console.error("Test audio failed:", err);
        setError(err instanceof Error ? err.message : 'Fehler beim Testen der Stimme.');
    } finally {
        setTestingSpeakerId(null);
    }
  };
  
    const handleTestRawVoice = async (voiceName: string) => {
        if (testAudioSourceRef.current) {
            try {
                testAudioSourceRef.current.stop();
            } catch (e) { /* ignore */ }
            testAudioSourceRef.current.disconnect();
            testAudioSourceRef.current = null;
        }

        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                setError('Ihr Browser unterstützt die Web Audio API nicht, die für die Audiowiedergabe benötigt wird.');
                return;
            }
        }
        const audioContext = audioContextRef.current;
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Check cache first
        if (testAudioCache.current.has(voiceName)) {
            const audioBuffer = testAudioCache.current.get(voiceName)!;
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();

            source.onended = () => {
                if (testAudioSourceRef.current === source) {
                    testAudioSourceRef.current = null;
                }
            };
            testAudioSourceRef.current = source;
            return; // Exit early since we played from cache
        }


        setTestingRawVoice(voiceName);
        setError(null);
        try {
            const pcmBytes = await testVoice(voiceName);
            if (pcmBytes.length === 0) {
               throw new Error('Die API hat keine Audiodaten zurückgegeben.');
            }

            const audioBuffer = pcmToAudioBuffer(pcmBytes, audioContext);
            testAudioCache.current.set(voiceName, audioBuffer); // Save to cache

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();

            source.onended = () => {
                if (testAudioSourceRef.current === source) {
                    testAudioSourceRef.current = null;
                }
            };
            testAudioSourceRef.current = source;
        } catch (err) {
            console.error("Test raw voice failed:", err);
            setError(err instanceof Error ? err.message : 'Audio-Generierung für den Test fehlgeschlagen.');
        } finally {
            setTestingRawVoice(null);
        }
    };


  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Bitte fügen Sie Text in den Editor ein, um ein Hörbuch zu generieren.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setAudioUrl(null);
    try {
      const audioBlob = await generateAudiobook(text, assignments, speakers, audioQuality);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeBook = async () => {
      if (!text.trim() || text.length < 50) {
          setError('Bitte fügen Sie einen längeren Text in den Editor ein, um die KI-Analyse zu verwenden.');
          return;
      }
      setError(null);
      setIsAnalyzing(true);
      try {
          // Pass the existing speakers to the AI for context and consistency.
          const result = await analyzeBookWithAI(text, speakers);
          if (!result || !result.segments) {
              throw new Error("Die KI hat keine gültigen Segmente zurückgegeben.");
          }

          let currentSpeakers = [...speakers];
          let currentSpeakerColors = { ...speakerColors };
          let currentSpeakerSettings = { ...speakerSettings };
          let currentAssignments: Assignment[] = [];
          let currentAtmosphereSuggestions: AtmosphereSuggestion[] = [];
          
          const speakerNameIdMap: Map<string, string> = new Map();
          // Pre-populate map with existing speakers
          currentSpeakers.forEach(s => speakerNameIdMap.set(s.displayName, s.id));

          let currentIndex = 0;
          
          const normalizeText = (t: string) => t.replace(/[\s"“„”'’`´]/g, '');

          for (const segment of result.segments) {
              let segmentText = segment.text;
              let startIndex = text.indexOf(segmentText, currentIndex);
              
              if (startIndex === -1) {
                  // Fallback to fuzzy search
                  const normalizedSegment = normalizeText(segmentText);
                  const searchArea = text.substring(currentIndex, currentIndex + segmentText.length + 50);
                  const normalizedSearchArea = normalizeText(searchArea);
                  
                  const fuzzyIndex = normalizedSearchArea.indexOf(normalizedSegment);
                  
                  if (fuzzyIndex !== -1) {
                      // Attempt to reconstruct the original segment from the main text
                      let originalSegmentLength = 0;
                      let normalizedCount = 0;
                      for (let i = 0; i < searchArea.length; i++) {
                          const char = searchArea[i];
                          if (!/[\s"“„”'’`´]/.test(char)) {
                              normalizedCount++;
                          }
                          if (normalizedCount > (fuzzyIndex + normalizedSegment.length -1)) {
                             break;
                          }
                          if(normalizedCount > fuzzyIndex) {
                            originalSegmentLength++;
                          }
                      }
                      
                      let startOffset = 0;
                      let normCount = 0;
                       for (let i = 0; i < searchArea.length; i++) {
                          const char = searchArea[i];
                           if (!/[\s"“„”'’`´]/.test(char)) {
                              normCount++;
                          }
                           if (normCount > fuzzyIndex) {
                             break;
                          }
                          startOffset++;
                       }

                      startIndex = currentIndex + startOffset;
                      segmentText = text.substring(startIndex, startIndex + originalSegmentLength);

                  } else {
                     console.warn(`Konnte das Segment "${segmentText.substring(0, 30)}..." nicht im Originaltext finden. Überspringe.`);
                     continue;
                  }
              }

              const endIndex = startIndex + segmentText.length;
              currentIndex = endIndex;
              
              let speakerId = speakerNameIdMap.get(segment.speakerName);

              // Create a new speaker if it doesn't exist
              if (!speakerId) {
                  const newId = `spk_${Date.now()}_${Math.random()}`;
                  const newVoice = ALL_AVAILABLE_VOICES[currentSpeakers.length % ALL_AVAILABLE_VOICES.length];
                  const newSpeaker: Speaker = {
                      id: newId,
                      name: segment.speakerName,
                      displayName: segment.speakerName,
                      voice: newVoice,
                  };
                  currentSpeakers.push(newSpeaker);
                  
                  const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                  currentSpeakerColors[newId] = randomColor;
                  currentSpeakerSettings[newId] = { mood: 'normal', speed: 'normal' };
                  
                  speakerId = newId;
                  speakerNameIdMap.set(segment.speakerName, speakerId);
              }
              
              // Create assignment
              currentAssignments.push({
                  id: Date.now() + Math.random(),
                  start: startIndex,
                  end: endIndex,
                  speakerId: speakerId,
                  mood: segment.mood as Mood,
                  speed: 'normal',
              });

              // Update speaker mood setting for this new assignment
              currentSpeakerSettings[speakerId] = {
                  ...currentSpeakerSettings[speakerId],
                  mood: segment.mood as Mood,
              };

              // Create atmosphere suggestion
              if (segment.atmosphere) {
                  currentAtmosphereSuggestions.push({
                      id: Date.now() + Math.random(),
                      start: startIndex,
                      end: endIndex,
                      description: segment.atmosphere,
                  });
              }
          }

          // Update state all at once
          setSpeakers(currentSpeakers);
          setSpeakerColors(currentSpeakerColors);
          setSpeakerSettings(currentSpeakerSettings);
          setAssignments(currentAssignments);
          setAtmosphereSuggestions(currentAtmosphereSuggestions);

      } catch (err) {
          console.error("AI analysis failed:", err);
          setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist bei der KI-Analyse aufgetreten.');
      } finally {
          setIsAnalyzing(false);
      }
  };
  
  const handleTextChange = (newText: string) => {
    setText(newText);
  };
  
  const handleClearText = () => {
    setText('');
    setAssignments([]);
    setAtmosphereSuggestions([]);
  };
  
  const handleSaveSettings = () => {
    try {
      const settingsToSave: SavedSettings = {
        speakers,
        speakerColors,
        speakerSettings,
      };
      const blob = new Blob([JSON.stringify(settingsToSave, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hoerbuch-sprecher-einstellungen.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen.');
    }
  };

  const handleTriggerLoadSettings = () => {
    settingsFileInputRef.current?.click();
  };
  
  const handleSettingsFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        const settings: SavedSettings = JSON.parse(fileContent);

        if (Array.isArray(settings.speakers) && typeof settings.speakerColors === 'object' && typeof settings.speakerSettings === 'object') {
          setSpeakers(settings.speakers);
          setSpeakerColors(settings.speakerColors);
          setSpeakerSettings(settings.speakerSettings);
          setAssignments([]);
          setAtmosphereSuggestions([]);
          setAudioUrl(null);
          setError(null);
        } else {
          throw new Error('Ungültiges Dateiformat.');
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einstellungsdatei.');
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveProject = () => {
    try {
        const projectData: ProjectData = {
            version: PROJECT_FILE_VERSION,
            title,
            text,
            assignments,
            atmosphereSuggestions,
            speakers,
            speakerColors,
            speakerSettings
        };
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeFilename = title.trim().replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_') || 'unbenanntes-projekt';
        a.download = `${safeFilename}.hbproj`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        setError('Fehler beim Speichern des Projekts.');
        console.error(err);
    }
  };

  const handleTriggerLoadProject = () => {
    projectFileInputRef.current?.click();
  };

  const handleProjectFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const fileContent = e.target?.result as string;
              const data: ProjectData = JSON.parse(fileContent);

              // Basic validation
              if (data.version && data.text !== undefined && Array.isArray(data.assignments) && Array.isArray(data.speakers)) {
                  setTitle(data.title || 'Mein Hörbuch');
                  setText(data.text);
                  setAssignments(data.assignments);
                  setSpeakers(data.speakers);
                  setSpeakerColors(data.speakerColors);
                  setSpeakerSettings(data.speakerSettings);
                  setAtmosphereSuggestions(data.atmosphereSuggestions || []); // Load suggestions, default to empty array
                  setAudioUrl(null);
                  setError(null);
              } else {
                  throw new Error('Ungültige oder beschädigte Projektdatei.');
              }
          } catch (err) {
              console.error("Error loading project:", err);
              setError(err instanceof Error ? err.message : 'Fehler beim Laden der Projektdatei.');
          } finally {
              if (event.target) {
                  event.target.value = '';
              }
          }
      };
      reader.readAsText(file);
  };


  const handleTriggerImport = () => {
    importFileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsFileLoading(true);
      setError(null);
      try {
          const fileName = file.name.toLowerCase();
          let extractedText = '';

          if (fileName.endsWith('.txt')) {
              extractedText = await file.text();
          } else if (fileName.endsWith('.pdf')) {
              const arrayBuffer = await file.arrayBuffer();
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              const pagePromises = [];
              for (let i = 1; i <= pdf.numPages; i++) {
                  pagePromises.push(pdf.getPage(i).then(async (page) => {
                      const textContent = await page.getTextContent();
                      return textContent.items.map((item: any) => item.str).join(' ');
                  }));
              }
              const pageTexts = await Promise.all(pagePromises);
              extractedText = pageTexts.join('\n\n');
          } else {
              throw new Error('Dateiformat nicht unterstützt. Bitte .txt oder .pdf verwenden.');
          }

          setText(extractedText);
          setAssignments([]);
          setAtmosphereSuggestions([]);
      } catch (err) {
          console.error("Fehler beim Dateiimport:", err);
          let errorMessage = 'Datei konnte nicht importiert und verarbeitet werden.';
          if (err instanceof Error) {
            errorMessage = err.message;
          } else if (typeof err === 'object' && err !== null && 'message' in err) {
            errorMessage = String((err as { message: string }).message);
          } else if (err) {
            errorMessage = String(err);
          }
          setError(errorMessage);
      } finally {
          setIsFileLoading(false);
          if (event.target) {
              event.target.value = '';
          }
      }
  };


  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const isOverHardLimit = charCount > CHAR_LIMIT;
  const isOverRecommendedLimit = !isOverHardLimit && charCount > RECOMMENDED_CHAR_LIMIT;

  const counterColor = isOverHardLimit
    ? 'text-red-500'
    : isOverRecommendedLimit
    ? 'text-yellow-400'
    : 'text-gray-500';


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col p-4 md:p-6 lg:p-8 relative">
       <AnalysisLoadingModal isOpen={isAnalyzing} />
       {isFileLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-50 fade-in">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-white">Datei wird verarbeitet...</p>
        </div>
       )}
        <input
          type="file"
          ref={settingsFileInputRef}
          onChange={handleSettingsFileSelected}
          accept=".json"
          hidden
        />
        <input
            type="file"
            ref={projectFileInputRef}
            onChange={handleProjectFileSelected}
            accept=".hbproj"
            hidden
        />
        <input
          type="file"
          ref={importFileInputRef}
          onChange={handleFileImport}
          accept=".txt,.pdf"
          hidden
        />
      <header className="mb-6">
        <div className="flex items-center py-2">
           <div className="flex-1">
             {/* Left spacer */}
           </div>
           <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500 flex-shrink-0 mx-4">
            Hörbuch-Gestalter
           </h1>
           <div className="flex-1 flex justify-end items-center gap-4">
              <button onClick={handleTriggerLoadProject} title="Projekt laden (.hbproj)" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 002 2z" />
                  </svg>
              </button>
              <button onClick={handleSaveProject} title="Projekt speichern (.hbproj)" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
              </button>
           </div>
        </div>
        <p className="text-gray-400 mt-2 text-lg text-center">
          Verwandeln Sie Text in ein mehrstimmiges Hörerlebnis.
        </p>
      </header>
      
      <main className="flex-grow flex flex-col lg:flex-row gap-6">
        <div className="flex-1 lg:w-2/3 flex flex-col bg-gray-800 rounded-xl shadow-2xl p-4">
          <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
            <h2 className="text-xl font-semibold text-gray-300">Text-Editor</h2>
             <div className="flex items-center gap-4">
              <button
                 onClick={handleAnalyzeBook}
                 disabled={isAnalyzing || isOverHardLimit}
                 className="text-sm bg-indigo-600/50 hover:bg-indigo-600/80 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-1 px-3 rounded-md transition-colors flex items-center gap-2"
                 title="Das Buch mit KI analysieren, um Sprecher und Stimmungen automatisch zuzuweisen."
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                 </svg>
                 Buch analysieren
              </button>
              <button 
                onClick={handleTriggerImport}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                title="PDF oder TXT-Datei laden"
              >
                Datei laden
              </button>
              <button 
                onClick={handleClearText}
                disabled={!text}
                className="text-sm text-indigo-400 hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                title="Gesamten Text löschen"
              >
                Text löschen
              </button>
            </div>
          </div>

          <div className="flex-grow relative min-h-[300px] lg:min-h-0">
             <HighlightingTextarea
                text={text}
                assignments={assignments}
                atmosphereSuggestions={atmosphereSuggestions}
                onTextChange={handleTextChange}
                onSelect={setSelection}
                speakerColors={speakerColors}
                id="main-textarea"
              />
               <div className="absolute bottom-2 right-4 text-xs font-mono select-none flex flex-col items-end">
                {isOverRecommendedLimit && (
                    <span className="text-yellow-400 mb-1">
                        Empfehlung: Für beste Ergebnisse kapitelweise analysieren.
                    </span>
                )}
                <span className={`transition-colors ${counterColor}`}>
                    {wordCount.toLocaleString()} Wörter / {charCount.toLocaleString()}/{CHAR_LIMIT.toLocaleString()}
                </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 lg:w-1/3 flex flex-col bg-gray-800 rounded-xl shadow-2xl p-4">
          <SpeakerSelector
            speakers={speakers}
            speakerColors={speakerColors}
            onAssignSpeaker={handleAssignSpeaker}
            selectionActive={!!selection && selection.start !== selection.end}
            speakerSettings={speakerSettings}
            onSpeakerSettingsChange={handleSpeakerSettingsChange}
            onAddSpeaker={handleAddSpeaker}
            onDeleteSpeaker={handleDeleteSpeaker}
            onSpeakerVoiceChange={handleSpeakerVoiceChange}
            onSpeakerNameChange={handleSpeakerNameChange}
            onSpeakerColorChange={handleSpeakerColorChange}
            onTestSpeaker={handleTestSpeaker}
            testingSpeakerId={testingSpeakerId}
            onSaveSettings={handleSaveSettings}
            onLoadSettings={handleTriggerLoadSettings}
            onTestRawVoice={handleTestRawVoice}
            testingRawVoice={testingRawVoice}
            maleVoices={MALE_VOICES}
            femaleVoices={FEMALE_VOICES}
          />

          <div className="mt-auto pt-4">
            <div className="mb-4">
              <label htmlFor="audio-title" className="block text-sm font-medium text-gray-400 mb-1">
                Titel des Hörbuchs
              </label>
              <input
                id="audio-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Geben Sie einen Titel ein..."
                className="w-full bg-gray-700 text-gray-100 rounded-md border border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="audio-quality" className="block text-sm font-medium text-gray-400 mb-1">
                Audioqualität
              </label>
              <select
                id="audio-quality"
                value={audioQuality}
                onChange={(e) => setAudioQuality(Number(e.target.value))}
                className="w-full bg-gray-700 text-gray-100 rounded-md border border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value={128}>Standard (128 kbps, kleine Datei)</option>
                <option value={192}>Hoch (192 kbps, gute Qualität)</option>
                <option value={320}>Höchste (320 kbps, beste Qualität)</option>
              </select>
            </div>
             <button
              onClick={handleGenerate}
              disabled={isLoading || !text.trim() || isOverHardLimit}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center text-lg shadow-lg"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span>Generiere Hörbuch...</span>
                </>
              ) : (
                'Hörbuch generieren'
              )}
            </button>
          </div>
        </div>
      </main>

       {error && (
        <div className="mt-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg text-center fade-in">
          <strong>Fehler:</strong> {error}
        </div>
      )}
      
      {audioUrl && (
        <footer className="mt-6">
            <AudioPlayer src={audioUrl} title={title} />
        </footer>
      )}
    </div>
  );
};

export default App;
