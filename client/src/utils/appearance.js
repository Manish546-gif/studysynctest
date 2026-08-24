const THEME_KEY = 'studysync-theme'
const FONT_KEY = 'studysync-font-v2'

const VALID_THEMES = ['light', 'dark', 'retro']

export const FONT_FAMILIES = {
  dmsans: '"DM Sans", sans-serif',
  playfair: '"Playfair Display", serif',
  jetbrains: '"JetBrains Mono", monospace',
}

function prefersDarkTheme() {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    )
  } catch {
    return false
  }
}

function systemTheme() {
  return prefersDarkTheme() ? 'dark' : 'light'
}

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (VALID_THEMES.includes(stored)) return stored
  } catch {
    // ignore storage errors (e.g. private mode)
  }
  // No stored preference: fall back to the system color scheme
  return systemTheme()
}

export function applyTheme(id) {
  // Only an explicit choice is persisted; without one we follow the system
  const explicit = VALID_THEMES.includes(id) ? id : null
  const theme = explicit || systemTheme()
  document.documentElement.setAttribute('data-theme', theme)
  if (!explicit) return
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
