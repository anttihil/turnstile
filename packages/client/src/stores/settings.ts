import { createSignal, createRoot } from 'solid-js';
import type { DisplayMode } from '@turnstile/engine';

// Load settings from localStorage
const loadSettings = () => {
  try {
    const stored = localStorage.getItem('turnstile-settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    displayMode: 'utf8' as DisplayMode,
    theme: 'light' as 'light' | 'dark',
  };
};

// Save settings to localStorage
const saveSettings = (settings: { displayMode: DisplayMode; theme: 'light' | 'dark' }) => {
  try {
    localStorage.setItem('turnstile-settings', JSON.stringify(settings));
  } catch {
    // Ignore write errors
  }
};

// Create global settings store
const createSettingsStore = () => {
  const initial = loadSettings();
  const [displayMode, setDisplayModeInternal] = createSignal<DisplayMode>(initial.displayMode);
  const [theme, setThemeInternal] = createSignal<'light' | 'dark'>(initial.theme);

  const setDisplayMode = (mode: DisplayMode) => {
    setDisplayModeInternal(mode);
    saveSettings({ displayMode: mode, theme: theme() });
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeInternal(newTheme);
    saveSettings({ displayMode: displayMode(), theme: newTheme });
    // Update document class for CSS
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme() === 'light' ? 'dark' : 'light');
  };

  return {
    displayMode,
    setDisplayMode,
    theme,
    setTheme,
    toggleTheme,
  };
};

// Export singleton store
export const settingsStore = createRoot(createSettingsStore);
