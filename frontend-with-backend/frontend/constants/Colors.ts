// EasyRead brand colors (keep these reds)
const primaryColor = "#961A36";
const accentColor = "#CC1E45";

export const Colors = {
   light: {
      // Core
      text: "#11181C",
      background: "#FFFFFF",
      icon: "#687076",
      tint: primaryColor,

      // Navigation / tabs
      tabIconDefault: "#687076",
      tabIconSelected: primaryColor,

      // Brand / app accents
      primary: primaryColor,
      accent: accentColor,
      headerBackground: primaryColor,
      buttonBackground: accentColor,
      textSecondary: "#4B5563",

      // NEW tokens (used across components)
      surface: "#FFFFFF",
      card: "#FFFFFF",
      border: "#E5E7EB",
      separator: "#E5E7EB",
      placeholder: "#9BA1A6",
      link: primaryColor,
      ripple: "rgba(0,0,0,0.08)",
      success: "#16A34A",
      warning: "#EA580C",
      danger: "#B91C1C",
   },

   dark: {
      // Core
      text: "#ECEDEE",
      background: "#0E1111",
      icon: "#9BA1A6",
      tint: primaryColor,

      // Navigation / tabs
      tabIconDefault: "#9BA1A6",
      tabIconSelected: "#FFFFFF",

      // Brand / app accents
      primary: primaryColor,
      accent: accentColor,
      headerBackground: primaryColor,
      buttonBackground: accentColor,
      textSecondary: "#4B5563",

      // NEW tokens (used across components)
      surface: "#151718",
      card: "#151718",
      border: "#2B2F31",
      separator: "#2B2F31",
      placeholder: "#9BA1A6",
      link: "#FFCDD6",
      ripple: "rgba(255,255,255,0.15)",
      success: "#22C55E",
      warning: "#F97316",
      danger: "#F87171",
   },
} as const;
