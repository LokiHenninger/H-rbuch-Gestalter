export interface Speaker {
  id: string;
  name: string; // Internal name, e.g., 'Erzähler', 'Stimme A'
  displayName: string; // User-editable name
  voice: string; // Gemini voice name
}

export type Mood = 'normal' | 'fröhlich' | 'traurig' | 'wütend' | 'flüsternd' | 'aufgeregt' | 'geheimnisvoll' | 'ironisch' | 'freundlich' | 'formell' | 'ängstlich';
export type Speed = 'langsam' | 'normal' | 'schnell';

export interface Assignment {
  id: number;
  start: number;
  end: number;
  speakerId: string;
  mood?: Mood;
  speed?: Speed;
}

export interface AtmosphereSuggestion {
  id: number;
  start: number;
  end: number;
  description: string;
}

export interface Selection {
  start: number;
  end: number;
}

export interface SpeakerSetting {
  mood: Mood;
  speed: Speed;
}

export interface SpeakerSettings {
  [speakerId: string]: SpeakerSetting;
}

export interface SavedSettings {
  speakers: Speaker[];
  speakerColors: { [key: string]: string };
  speakerSettings: SpeakerSettings;
}

export interface ProjectData extends SavedSettings {
  version: number;
  title: string;
  text: string;
  assignments: Assignment[];
  atmosphereSuggestions?: AtmosphereSuggestion[];
}