export default {
  name: 'Labyrinth',
  // 64×64 PNG, 4px arms, ≤ 18000 bytes. docs/avatar.md
  skin: 'assets/me.png',
  languages: ['en'],
  weather: {
    city: 'Hamirpur',
    cityEn: 'Hamirpur',
    latitude: 31.7084,
    longitude: 76.5274,
    timezone: 'Asia/Kolkata',
  },
  // The top bar links every station; the Dock keeps five so it fits beside the radar on phones.
  dock: ['welcome', 'tracks', 'schedule', 'prizes', 'register'],
  mailbox: { endpoint: '', email: 'prashant@labyrinth.dev', turnstileSitekey: '' },
  // Labyrinth, the chat widget/pet, served by backend/agent. Leave endpoint empty to hide it.
  // `icon` is the button/sprite image; swap in your own file and point this at it.
  agent: { endpoint: 'http://localhost:8787/api/chat', icon: 'assets/labyrinth-icon.svg' },
  badge: false,
};
