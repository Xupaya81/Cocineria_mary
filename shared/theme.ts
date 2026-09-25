export const fontOptions = {
  serif: {
    name: "Georgia · clásica",
    css: 'Georgia, "Times New Roman", serif',
  },
  sans: { name: "Arial · moderna", css: "Arial, Helvetica, sans-serif" },
  humanist: {
    name: "Trebuchet · cercana",
    css: '"Trebuchet MS", Arial, sans-serif',
  },
  readable: {
    name: "Verdana · muy legible",
    css: "Verdana, Geneva, sans-serif",
  },
  editorial: {
    name: "Palatino · editorial",
    css: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  },
  mono: {
    name: "Courier · artesanal",
    css: '"Courier New", Courier, monospace',
  },
} as const;
export type FontKey = keyof typeof fontOptions;
export const themeDefaults = {
  bodyFont: "sans" as FontKey,
  textColor: "#283e35",
  headingColor: "#283e35",
  mutedColor: "#59665d",
  buttonTextColor: "#ffffff",
  surface: "#fffdf7",
};
export const themePresets = [
  {
    name: "Mary natural",
    values: {
      ...themeDefaults,
      font: "serif" as FontKey,
      primary: "#244b40",
      secondary: "#a9502c",
      background: "#faf7f0",
    },
  },
  {
    name: "Mar y arena",
    values: {
      ...themeDefaults,
      font: "editorial" as FontKey,
      bodyFont: "humanist" as FontKey,
      primary: "#205367",
      secondary: "#a44a22",
      background: "#f7f5ee",
      headingColor: "#203e50",
      textColor: "#273c46",
      mutedColor: "#52616a",
    },
  },
  {
    name: "Noche cálida",
    values: {
      font: "serif" as FontKey,
      bodyFont: "sans" as FontKey,
      primary: "#ecc58f",
      secondary: "#f0bb81",
      background: "#202821",
      surface: "#2d372e",
      textColor: "#f0eee4",
      headingColor: "#fff4db",
      mutedColor: "#ced5c5",
      buttonTextColor: "#202821",
    },
  },
];
