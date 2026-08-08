const THEME_KEY = 'studysync-theme'
const FONT_KEY = 'studysync-font-v2'

export const FONT_FAMILIES = {
  dmsans: '"DM Sans", sans-serif',
  playfair: '"Playfair Display", serif',
  jetbrains: '"JetBrains Mono", monospace',
}

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(id) {
  const theme = ['light', 'dark', 'retro'].includes(id) ? id : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

export function getStoredFont() {
  try {
    const id = localStorage.getItem(FONT_KEY)
    return id && FONT_FAMILIES[id] ? id : 'dmsans'
  } catch {
    return 'dmsans'
  }
}

export function applyFont(id) {
  const family = FONT_FAMILIES[id] || FONT_FAMILIES.dmsans
  document.documentElement.style.setProperty('--font-body', family)
  document.documentElement.style.setProperty('--font-display', family)
  try {
    localStorage.setItem(FONT_KEY, id in FONT_FAMILIES ? id : 'dmsans')
  } catch {
    // ignore storage errors
  }
}
