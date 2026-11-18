// Loaded with <script type="module" async>: starts the page view as soon as its
// own small modules arrive, instead of after the 3D engine (engine/main.js)
// has downloaded. site.js still calls initPageView() later; it builds once.
if (new URLSearchParams(location.search).has('plain') && document.getElementById('pages')) {
  import('../page.js').then(m => m.initPageView()).catch(err => console.error('Page view:', err));
}
