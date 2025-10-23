/**
 * Color utility functions for theme management
 */

/**
 * Convert HSL color string to RGB hex
 */
export function hslToHex(hsl: string): string {
  const match = hsl.match(
    /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/
  );
  if (!match) return '';

  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Get computed CSS variable value and optionally convert to hex
 */
export function getCSSVariable(variable: string, convertToHex = false): string {
  if (typeof document === 'undefined') return '';

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();

  if (!convertToHex) return value;

  // If it's already a hex color, return it
  if (value.startsWith('#')) return value;

  // If it's an RGB/RGBA value, convert to hex
  if (value.startsWith('rgb')) {
    const match = value.match(/\d+/g);
    if (match) {
      const [r, g, b] = match.map(Number);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
  }

  // If it's an HSL value, convert to hex
  if (value.includes(' ') || value.startsWith('hsl')) {
    return hslToHex(value);
  }

  return value;
}

/**
 * Check if the document is in dark mode
 */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Check system preference for dark mode
 */
export function getSystemThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Get all theme CSS variables
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
}

export function getThemeColors(asHex = false): ThemeColors {
  return {
    background: getCSSVariable('--background', asHex),
    foreground: getCSSVariable('--foreground', asHex),
    card: getCSSVariable('--card', asHex),
    cardForeground: getCSSVariable('--card-foreground', asHex),
    popover: getCSSVariable('--popover', asHex),
    popoverForeground: getCSSVariable('--popover-foreground', asHex),
    primary: getCSSVariable('--primary', asHex),
    primaryForeground: getCSSVariable('--primary-foreground', asHex),
    secondary: getCSSVariable('--secondary', asHex),
    secondaryForeground: getCSSVariable('--secondary-foreground', asHex),
    muted: getCSSVariable('--muted', asHex),
    mutedForeground: getCSSVariable('--muted-foreground', asHex),
    accent: getCSSVariable('--accent', asHex),
    accentForeground: getCSSVariable('--accent-foreground', asHex),
    destructive: getCSSVariable('--destructive', asHex),
    destructiveForeground: getCSSVariable('--destructive-foreground', asHex),
    border: getCSSVariable('--border', asHex),
    input: getCSSVariable('--input', asHex),
    ring: getCSSVariable('--ring', asHex),
    radius: getCSSVariable('--radius', asHex),
  };
}
