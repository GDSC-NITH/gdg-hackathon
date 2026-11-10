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
  badge: false,
};
