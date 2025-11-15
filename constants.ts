
import type { Speaker, Mood, Speed } from './types';

export const INITIAL_SPEAKERS: Speaker[] = [
  { id: 'spk_1', name: 'Erzähler', displayName: 'Erzähler', voice: 'kore' },
];

export const MALE_VOICES: string[] = [
    'charon', 'fenrir', 'iapetus', 'orus', 'puck', 'umbriel', 'zephyr', 'achernar', 
    'achird', 'alnilam', 'enceladus', 'gacrux', 'rasalgethi', 'sadaltager', 'zubenelgenubi'
];

export const FEMALE_VOICES: string[] = [
    'aoede', 'autonoe', 'callirrhoe', 'despina', 'erinome', 'kore', 'laomedeia', 
    'leda', 'algenib', 'algieba', 'pulcherrima', 'sadachbia', 'schedar', 'sulafat', 
    'vindemiatrix'
];

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
