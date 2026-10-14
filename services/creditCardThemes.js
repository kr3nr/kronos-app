export const CARD_THEMES = [
  { id: 'midnight', label: 'Medianoche', color: '#172554', colors: ['#1e3a8a', '#172554', '#0f172a'] },
  { id: 'emerald', label: 'Esmeralda', color: '#064e3b', colors: ['#059669', '#064e3b', '#022c22'] },
  { id: 'violet', label: 'Violeta', color: '#3b0764', colors: ['#7c3aed', '#4c1d95', '#2e1065'] },
  { id: 'garnet', label: 'Granate', color: '#7f1d1d', colors: ['#dc2626', '#7f1d1d', '#450a0a'] },
  { id: 'graphite', label: 'Grafito', color: '#27272a', colors: ['#52525b', '#27272a', '#18181b'] },
  { id: 'ocean', label: 'Océano', color: '#164e63', colors: ['#0891b2', '#164e63', '#083344'] },
  { id: 'bronze', label: 'Bronce', color: '#78350f', colors: ['#d97706', '#78350f', '#451a03'] },
];

export const getCardTheme = (color) => CARD_THEMES.find(theme => theme.color === color) || CARD_THEMES[4];
