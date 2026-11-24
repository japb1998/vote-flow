// Prevent flash of wrong theme/palette — runs before React mounts
(function () {
  var t = null;
  var p = null;
  try {
    t = localStorage.getItem('vf-theme');
    p = localStorage.getItem('vf-palette');
  } catch (e) {
    // Ignore storage errors in restricted or privacy modes
  }
  if (!t) {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
  if (p) document.documentElement.setAttribute('data-palette', p);
})();
