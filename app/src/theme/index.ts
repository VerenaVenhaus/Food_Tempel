// Zentrales Design-System / Theme.
// Alle Farben, Schriftgrößen, Abstände kommen aus dieser Datei.
// Vorteil: Änderungen passieren an EINER Stelle, nicht über die ganze App
// verteilt. Wenn wir später Dark-Mode bauen, geht das nur hier rein.
//
// Farbpalette: vom Koala-Logo abgeleitet — warmes Orange (Mütze/Karotte),
// Teal (Skateboard), Frischgrün (Möhrenkraut), warme Crèmetöne (Hintergrund).
// Soll "harmonisch und healthy" wirken: natürliche Töne, kein Neon.

export const colors = {
  // Primärfarbe: warmes Karotten-Orange — Hauptknöpfe, aktive Elemente
  primary: "#EE7242",
  primaryDark: "#C95A2E",
  primaryLight: "#FCE2D4", // sehr helle Variante für Chip-Hintergründe etc.

  // Akzent: Teal vom Skateboard — sekundäre positive Aktionen, "healthy" Tags
  accent: "#2A8A8A",
  accentLight: "#D8EEEE",

  // Frischegrün vom Möhrenkraut — für "vegan"-/"gesund"-Highlights
  fresh: "#7CB342",
  freshDark: "#5A8628", // lesbar als Text auf freshLight
  freshLight: "#E5F1D4",

  // Gold/Honig — Warnungen, Hinweise
  warning: "#E9B14E",
  // Warmes Rot — Fehler, Löschen, destruktive Aktionen
  danger: "#D04A36",

  // Neutralfarben — leicht warm getönt, damit's natürlich wirkt
  background: "#FBFAF7", // warmes Off-White (App-Hintergrund)
  navbarBg: "#EAF2DC", // subtiles Grün-Beige — für Header/Navbar
  surface: "#F4F1EC", // sehr helles Crème
  border: "#E0DDD7",
  textPrimary: "#2A2826", // fast schwarz, leicht warm
  textSecondary: "#6B6863",
  textMuted: "#A8A4A0",

  // Modal-Hintergrund (halbtransparent über der App)
  overlay: "rgba(0, 0, 0, 0.4)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
};

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

// Schatten (Karten-Effekt). Auf iOS via shadow*, auf Android via elevation.
export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
};
