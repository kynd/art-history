// Preset topic chips shown on the homepage. Each `query` is embedded exactly like a
// typed search — semantic, not literal. `label` is what the chip displays.
// Single source of truth: imported by both the build-index script and the homepage.
export const TOPICS = [
  // World history
  { label: 'World Wars', query: 'the world wars, total war, and their global consequences' },
  { label: 'Cold War', query: 'the cold war, superpower rivalry, and the nuclear age' },
  { label: 'Modern Japan', query: 'the modern history of Japan, from empire to economic power' },
  { label: 'Globalization', query: 'globalization, trade, and an interconnected world economy' },
  { label: 'Technology & Science', query: 'science and technology transforming society and daily life' },
  // Art & culture
  { label: 'Modern Art', query: 'modern art movements and the avant-garde' },
  { label: 'Abstraction', query: 'abstraction and the departure from representation' },
  { label: 'Pop & The Everyday', query: 'pop art, mass culture, and the everyday object as art' },
  { label: 'Design & Architecture', query: 'modern design, architecture, and the built environment' },
  { label: 'Film & Manga', query: 'cinema, animation, manga, and popular visual culture' },
  { label: 'Color & Light', query: 'color, light, and perception in painting' },
  { label: 'Folk & Regional', query: 'folk art, craft, and regionally embedded traditions' },
];
