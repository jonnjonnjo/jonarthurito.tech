export const themes = ['wave', 'dragon', 'lotus'] as const;
export type Theme = typeof themes[number];

export function getTheme(): Theme {
  return (localStorage.getItem('theme') as Theme) ?? 'lotus';
}

export function setTheme(theme: Theme) {
  localStorage.setItem('theme', theme);
  document.documentElement.classList.remove('theme-wave', 'theme-dragon', 'theme-lotus');
  document.documentElement.classList.add(`theme-${theme}`);
}

export function cycleTheme() {
  const current = getTheme();
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  setTheme(next);
  return next;
}

export function initTheme() {
  setTheme(getTheme());
}
