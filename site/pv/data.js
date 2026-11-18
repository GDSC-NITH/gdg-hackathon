// Page-view content that the 3D cards in index.html do not carry.
// Everything else (schedule, prizes, sponsors, tracks, FAQ, venue, forms)
// is read from the <article data-station> cards, so the two views stay in sync.

// Organising team. `photo` is optional (a 400×500 WebP in assets/team/);
// without one the card draws a pixel portrait from the name.
export const TEAM = [
  { name: 'Harsh Bhushan Pathak', role: 'Lead Organiser' },
  { name: 'Daksh', role: 'Lead Organiser' },
  { name: 'Divyansh', role: 'Lead Organiser' },
];

// Events the chapter has run. `boss` marks the featured card; `icon` picks its
// line icon in build.js (shield, branch, seed, flag, terminal).
export const PAST = [
  {
    boss: true, icon: 'shield', tag: 'Boss level · National hackathon', title: 'HackSecure ’26', meta: '10–11 March 2026 · NIT Hamirpur',
    text: 'A national-level security hackathon run under the ISEA Phase III programme of MeitY, Government of India. Teams built mobile device and application security tools.',
    stats: ['₹2,00,000+ prize pool', 'ISEA Phase III · MeitY'],
  },
  { icon: 'branch', tag: 'MLH-backed', title: 'Hacktoberfest Hack Day 2026', meta: '6-hour in-person hackathon', text: 'A day of building and shipping, backed by Major League Hacking.', stats: ['300+ attendees', '55+ projects'] },
  { icon: 'seed', tag: 'Freshers’ orientation', title: 'Genesis', meta: 'Two editions', text: 'Where first-years meet the chapter and start building.', stats: ['2 editions', '500+ attendees'] },
  { icon: 'flag', tag: 'National programme', title: 'Smart India Hackathon', meta: 'Campus rounds', text: 'Campus rounds for the 2025 and 2026 editions.', stats: ['2025', '2026'] },
  { icon: 'terminal', tag: 'Capture the Flag', title: 'Cryptex CTF', meta: 'Nimbus 2026', text: 'Our annual Capture the Flag at Nimbus 2026, the institute’s techfest.', stats: ['Annual', 'Nimbus techfest'] },
];

// The chapter in numbers, from the past year.
export const COMMUNITY = [
  { val: '9+', lbl: 'Events run', icon: 'calendar' },
  { val: '2,000+', lbl: 'Students joined', icon: 'users' },
  { val: '400+', lbl: 'Projects submitted', icon: 'code' },
];

// Sponsors and partners of past events.
export const BACKERS = [
  'Major League Hacking', 'ElevenLabs', 'n8n', '169Pi', 'Risers Cre8', 'webcmd by Slab Technology',
  'CipherSchools', '.xyz', 'Softgear Technologies', 'MeitY, Govt. of India', 'ISEA', 'Devfolio',
];

// Section labels used by the nav, the menu and the section headers.
export const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'partners', label: 'Sponsors' },
  { id: 'awards', label: 'Prizes' },
  { id: 'crew', label: 'Team' },
  { id: 'past', label: 'Past events' },
  { id: 'quests', label: 'Tracks' },
  { id: 'contact', label: 'Contact' },
];

// Links into the old card ids (from the 3D view, shared links) land on the
// matching page-view section.
export const ALIASES = {
  welcome: 'about', schedule: 'timeline', sponsors: 'partners', prizes: 'awards',
  team: 'crew', tracks: 'quests', faq: 'contact', venue: 'contact', register: 'contact',
  mailbox: 'contact', top: 'top',
};
