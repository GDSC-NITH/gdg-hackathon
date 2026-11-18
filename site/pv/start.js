// Loaded with <script type="module" async>: starts the page view as soon as its
// own small modules arrive. In the page view the 3D engine (engine/main.js) and
// site/site.js are not loaded at all (see the end of index.html). When the 3D
// world fails to start, site.js falls back to initPageView(); it builds once.
if (new URLSearchParams(location.search).has('plain') && document.getElementById('pages')) {
  // The 3D engine is not loaded in the page view; this is the part of its
  // plain-mode setup the page needs.
  document.body.classList.add('plain');
  document.getElementById('loading')?.remove();
  import('../page.js').then(m => m.initPageView()).catch(err => console.error('Page view:', err));
}
