/* Applies the stored or system colour theme before the first paint. */
(function applyInitialTheme() {
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem("devagora-theme");
  } catch (storageError) {
    storedTheme = null;
  }
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = storedTheme || (prefersDarkScheme ? "dark" : "light");
})();
