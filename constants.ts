import type { Speaker, Mood, Speed } from './types';

export const VOICE_DB_VERSION = 4; // Version für die Stimmen-Datenbank erhöht, um die neue Sortierung zu erzwingen

export const INITIAL_SPEAKERS: Speaker[] = [
  { id: 'spk_1', name: 'Erzähler', displayName: 'Erzähler', voice: 'Orus' },
];

// Weibliche Stimmen sind: achernar, aoede, callirrhoe, despina, kore, leda, zephyr.
export const FEMALE_VOICES: string[] = [
    'Achernar', 
    'Aoede', 
    'Callirrhoe',
    'Despina', 
    'Kore',
    'Leda', 
    'Zephyr', 
].sort();

// Männliche Stimmen sind: charon, fenrir, iapetue, orus, puck, schedar, umbriel.
export const MALE_VOICES: string[] = [
    'Charon', 
    'Fenrir', 
    'Iapetus', // Typo corrected from "iapetue"
    'Orus', 
    'Puck', 
    'Schedar', 
    'Umbriel',
].sort();


export const ALL_AVAILABLE_VOICES: string[] = [...MALE_VOICES, ...FEMALE_VOICES].sort();


export const INITIAL_SPEAKER_COLORS: { [key: string]: string } = {
  'spk_1': '#818CF8', // indigo-400
};

export const MOODS: { value: Mood; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'fröhlich', label: 'Fröhlich' },
  { value: 'traurig', label: 'Traurig' },
  { value: 'wütend', label: 'Wütend' },
  { value: 'flüsternd', label: 'Flüsternd' },
  { value: 'aufgeregt', label: 'Aufgeregt' },
  { value: 'geheimnisvoll', label: 'Geheimnisvoll' },
  { value: 'ironisch', label: 'Ironisch' },
  { value: 'freundlich', label: 'Freundlich' },
  { value: 'formell', label: 'Formell' },
  { value: 'ängstlich', label: 'Ängstlich' },
];

export const SPEEDS: { value: Speed; label: string }[] = [
  { value: 'langsam', label: 'Langsam' },
  { value: 'normal', label: 'Normal' },
  { value: 'schnell', label: 'Schnell' },
];