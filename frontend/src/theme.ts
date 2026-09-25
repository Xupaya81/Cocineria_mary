import { fontOptions, themeDefaults } from "../../shared/theme";
import type { Content } from "../../shared/schema";
export function applyTheme(content: Content) {
  const theme = { ...themeDefaults, ...content };
  const values = {
    "--primary": theme.primary,
    "--accent": theme.secondary,
    "--paper": theme.background,
    "--heading": fontOptions[theme.font].css,
    "--body-font": fontOptions[theme.bodyFont].css,
    "--text": theme.textColor,
    "--heading-color": theme.headingColor,
    "--muted": theme.mutedColor,
    "--button-text": theme.buttonTextColor,
    "--surface": theme.surface,
  };
  for (const [key, value] of Object.entries(values))
    document.documentElement.style.setProperty(key, value);
}
