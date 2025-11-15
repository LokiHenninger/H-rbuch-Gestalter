
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { Assignment, Speaker, Mood, Speed, SpeakerSetting } from '../types';

// Deklarieren der globalen lamejs-Bibliothek, die über ein Skript-Tag importiert wird
declare const lamejs: any;

// Helper function for audio processing
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes raw PCM audio samples into an MP3 Blob using lamejs.
 * @param pcm16Samples - The raw audio data as 16-bit signed integers.
 * @param bitRate - The desired bitrate for the MP3 encoding (e.g., 128, 192, 320).
 * @returns A Blob containing the MP3 audio data.
 */
function encodeToMp3(pcm16Samples: Int16Array, bitRate: number): Blob {
  const sampleRate = 24000; // Gemini TTS sample rate
  const channels = 1; // mono

  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);
  const mp3Data = [];

  const sampleBlockSize = 1152; // LAME internal block size

  for (let i = 0; i < pcm16Samples.length; i += sampleBlockSize) {
    const sampleChunk = pcm16Samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }
  }
  const mp3buf = mp3encoder.flush(); 
  if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

/**
 * Creates a text prompt for the TTS API based on mood and speed settings.
 */
function getPromptForPart(text: string, mood?: Mood, speed?: Speed): string {
    const moodMap: Record<Mood, string> = {
        'normal': '', 
        'fröhlich': 'cheerfully', 
        'traurig': 'sadly', 
        'wütend': 'angrily', 
        'flüsternd': 'in a whisper',
        'aufgeregt': 'excitedly',
        'geheimnisvoll': 'mysteriously',
        'ironisch': 'sarcastically',
        'freundlich': 'kindly',
        'formell': 'formally',
        'ängstlich': 'anxiously',
    };
    const speedMap: Record<Speed, string> = {
        'normal': '', 'langsam': 'slowly', 'schnell': 'quickly'
    };

    const moodPart = moodMap[mood || 'normal'];
    const speedPart = speedMap[speed || 'normal'];
    
    const instructions = [moodPart, speedPart].filter(Boolean);
    
    if (instructions.length > 0) {
        return `Say ${instructions.join(' and ')}: ${text}`;
    }
    
    return text;
}

/**
 * Runs an array of promise-returning functions (thunks) with a specified concurrency limit.
 * Preserves the order of results. Failed promises result in null.
 * @param promiseThunks - An array of functions, each returning a promise.
 * @param concurrency - The maximum number of promises to run at once.
 * @returns A promise that resolves to an array of results.
 */
async function runPromisesWithConcurrency<T>(
  promiseThunks: (() => Promise<T>)[],
  concurrency: number
): Promise<(T | null)[]> {
  const results: (T | null)[] = new Array(promiseThunks.length).fill(null);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < promiseThunks.length) {
      const taskIndex = currentIndex++;
      const thunk = promiseThunks[taskIndex];
      if (thunk) {
        try {
          const result = await thunk();
          results[taskIndex] = result;
        } catch (error) {
          console.error(`Promise at index ${taskIndex} failed:`, error);
          // results[taskIndex] remains null
        }
      }
    }
  };

  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);

  return results;
}


/**
 * Generates an audiobook by converting assigned text parts to speech in parallel,
 * and then stitching them together into a single MP3 audio file.
 * Unassigned parts of the text are spoken by the default narrator.
 */
export async function generateAudiobook(
  text: string,
  assignments: Assignment[],
  speakers: Speaker[],
  audioQuality: number
): Promise<Blob> {
  if (!process.env.API_KEY) {
    throw new Error("API key is not set. Please configure your environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const sortedAssignments = [...assignments].sort((a, b) => a.start - b.start);
  
  const textParts: { text: string; speakerId: string; mood?: Mood; speed?: Speed; }[] = [];
  let lastIndex = 0;
  const narratorSpeakerId = speakers[0]?.id || 'spk_1'; // Default to Erzähler

  for (const assignment of sortedAssignments) {
    // Ignore overlapping assignments for simplicity, the first one in order wins.
    if (assignment.start < lastIndex) continue;
    
    // Add unassigned text before the current assignment
    if (assignment.start > lastIndex) {
      const unassignedText = text.substring(lastIndex, assignment.start);
      if (unassignedText.trim().length > 0) {
        textParts.push({ text: unassignedText, speakerId: narratorSpeakerId, mood: 'normal', speed: 'normal' });
      }
    }
    
    // Add the assigned text
    const assignedText = text.substring(assignment.start, assignment.end);
    if (assignedText.trim().length > 0) {
      textParts.push({ text: assignedText, speakerId: assignment.speakerId, mood: assignment.mood, speed: assignment.speed });
    }
    
    lastIndex = assignment.end;
  }

  // Add any remaining unassigned text at the end of the document
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText.trim().length > 0) {
      textParts.push({ text: remainingText, speakerId: narratorSpeakerId, mood: 'normal', speed: 'normal' });
    }
  }
  
  if (textParts.length === 0 && text.trim().length > 0) {
      // Case where there is text but no assignments were made
      textParts.push({text: text, speakerId: narratorSpeakerId, mood: 'normal', speed: 'normal'});
  }

  if (textParts.length === 0) {
    throw new Error("Kein gültiger Text zur Audioerzeugung gefunden.");
  }

  const CONCURRENCY_LIMIT = 5;

  // Create an array of promise-returning functions (thunks) for concurrent execution
  const promiseThunks = textParts.map((part) => async (): Promise<Uint8Array | null> => {
    const speaker = speakers.find(s => s.id === part.speakerId);
    if (!speaker) {
      console.warn(`Sprecher mit ID ${part.speakerId} nicht gefunden. Überspringe Textabschnitt.`);
      return null;
    }
    
    const promptText = getPromptForPart(part.text, part.mood, part.speed);

    try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: promptText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: speaker.voice },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio ? decode(base64Audio) : null;
    } catch (err) {
        console.error(`Fehler bei der Audio-Generierung für Teil "${part.text.substring(0, 30)}...":`, err);
        return null;
    }
  });
  
  const audioChunkResults = await runPromisesWithConcurrency(promiseThunks, CONCURRENCY_LIMIT);
  const audioChunks: Uint8Array[] = audioChunkResults.filter((chunk): chunk is Uint8Array => chunk !== null && chunk.length > 0);
  
  if (audioChunks.length === 0) {
    throw new Error('Audio-Generierung fehlgeschlagen. Die API hat für keinen Abschnitt Audiodaten zurückgegeben.');
  }

  // Concatenate all the raw audio byte arrays into one
  let totalLength = 0;
  audioChunks.forEach(chunk => { totalLength += chunk.length; });
  const combinedAudioBytes = new Uint8Array(totalLength);
  let offset = 0;
  audioChunks.forEach(chunk => {
    combinedAudioBytes.set(chunk, offset);
    offset += chunk.length;
  });

  // The API returns raw PCM data, which we now encode to MP3
  if (combinedAudioBytes.byteLength === 0) {
    throw new Error('Keine Audiodaten zum Kodieren vorhanden.');
  }
  
  // The raw data is 16-bit PCM, so we create an Int16Array view on the buffer
  const pcm16Samples = new Int16Array(combinedAudioBytes.buffer);

  // Encode the PCM data to an MP3 Blob
  const mp3Blob = encodeToMp3(pcm16Samples, audioQuality);

  return mp3Blob;
}


/**
 * Generates a short audio clip for testing a speaker's voice,
 * applying the currently selected mood and speed settings.
 * Returns raw PCM data for fast playback.
 */
export async function testSpeakerVoice(speaker: Speaker, settings: SpeakerSetting): Promise<Uint8Array> {
    if (!process.env.API_KEY) {
        throw new Error("API key is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // The prompt uses the selected mood and speed.
    const promptText = getPromptForPart("Test", settings.mood, settings.speed);

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: speaker.voice },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error('Audio-Generierung für den Test fehlgeschlagen.');
    }
    
    // Return raw audio bytes directly to avoid slow client-side MP3 encoding for tests.
    const audioBytes = decode(base64Audio);
    return audioBytes;
}

/**
 * Generates a short audio clip for testing a specific voice with a neutral prompt.
 * Returns raw PCM data for fast playback.
 */
export async function testVoice(voiceName: string): Promise<Uint8Array> {
    if (!process.env.API_KEY) {
        throw new Error("API key is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const promptText = "Test";

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error('Audio-Generierung für den Test fehlgeschlagen.');
    }
    
    return decode(base64Audio);
}

/**
 * Analyzes the book text using a powerful AI model to identify speakers, moods, and atmospheres.
 */
export async function analyzeBookWithAI(text: string, existingSpeakers: Speaker[]): Promise<any> {
    if (!process.env.API_KEY) {
        throw new Error("API key is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const validMoods: Mood[] = ['normal', 'fröhlich', 'traurig', 'wütend', 'flüsternd', 'aufgeregt', 'geheimnisvoll', 'ironisch', 'freundlich', 'formell', 'ängstlich'];
    
    const speakerList = existingSpeakers.map(s => s.displayName).join(', ');

    const prompt = `
      Analysiere den folgenden Buchtext. Deine Aufgabe ist es, den Text in Segmente zu unterteilen, basierend darauf, wer spricht oder ob es sich um eine Erzählung handelt.
      
      Du bekommst eine Liste von bereits existierenden Sprechern: [${speakerList}].
      Verwende diese Sprecher konsistent wieder, wenn sie im Text auftauchen. Erstelle nur dann einen neuen Sprecher, wenn ein Charakter spricht, der noch nicht in der Liste ist. Der Standard-Sprecher ist "Erzähler".

      Regeln:
      1. Wörtliche Rede wird den entsprechenden Charakteren zugeordnet. Verwende die Namen aus der existierenden Sprecherliste.
      2. Die "mood" MUSS einer der folgenden Werte sein: ${validMoods.join(', ')}. Wähle immer den passendsten.
      3. "atmosphere" ist optional. Gib sie nur an, wenn der Text explizit eine hörbare Atmosphäre beschreibt.
      4. Die Textsegmente müssen lückenlos den gesamten Originaltext abdecken und exakt mit dem Originaltext übereinstimmen.
      5. Gib deine Antwort ausschließlich als JSON-Objekt zurück, das dem vorgegebenen Schema entspricht.

      Text zum Analysieren:
      ---
      ${text}
      ---
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            maxOutputTokens: 8192, // Genug Platz für lange Antworten sicherstellen
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    segments: {
                        type: Type.ARRAY,
                        description: "Eine Liste aller Textsegmente, die den gesamten Text lückenlos abdecken.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: {
                                    type: Type.STRING,
                                    description: "Der exakte Text des Segments."
                                },
                                speakerName: {
                                    type: Type.STRING,
                                    description: "Name des Sprechers (z.B. 'Erzähler', 'Loki', 'Anna'). Muss ein Name aus der existierenden Liste sein, oder ein neuer, falls notwendig."
                                },
                                mood: {
                                    type: Type.STRING,
                                    description: `Die Stimmung des Sprechers. Muss einer der folgenden Werte sein: ${validMoods.join(', ')}.`,
                                    enum: validMoods
                                },
                                atmosphere: {
                                    type: Type.STRING,
                                    description: "Eine kurze Beschreibung der hörbaren Hintergrundatmosphäre (optional)."
                                }
                            },
                            required: ["text", "speakerName", "mood"]
                        }
                    }
                },
                required: ["segments"]
            },
        },
    });

    // Trim potential markdown fences
    let jsonStr = response.text.trim();
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.substring(7);
    }
    if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.substring(0, jsonStr.length - 3);
    }

    try {
        const parsedJson = JSON.parse(jsonStr);
        return parsedJson;
    } catch (error) {
        console.error("Failed to parse AI response:", error, "Raw response:", jsonStr);
        throw new Error("Die KI-Analyse hat ein ungültiges Format zurückgegeben. Bitte versuchen Sie es erneut.");
    }
}
