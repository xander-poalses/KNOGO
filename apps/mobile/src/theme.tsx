import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";

export const lightColours = {
  background: "#F3F3E8",
  surface: "#F6F7F2",
  elevated: "#e9ede7",
  statusSurface: "#e7e7df",
  tripSurface: "#F6F7F2",
  sheetSurface: "#e9ede7",
  sheetInset: "#e1e6e0",
  controlBorder: "#657168",
  focus: "#0b4f2f",
  primary: "#0b4f2f",
  primarySoft: "#e1ece4",
  gold: "#c8a13a",
  coral: "#a65742",
  success: "#17623c",
  warning: "#774d0b",
  closed: "#9c3c32",
  text: "#17221b",
  muted: "#505a52",
  border: "#d8ddd7a4",
  control: "#F6F7F2",
  controlStrong: "#e1e6e0",
  white: "#ffffff",
  paper: "#f6f7f3",
  ink: "#17221b",
  green: "#0b4f2f",
  greenSoft: "#e1ece4",
  yellow: "#c8a13a",
  red: "#9c3c32",
  blue: "#17623c",
  line: "#d8ddd7"
  ,
  headerBorder: "rgba(11,79,47,0.24)",
  overlay: "rgba(6,35,22,0.24)",
  overlayStrong: "rgba(23,32,24,0.34)",
  searchOverlay: "rgba(6,35,22,0.28)",
  featureTint: "rgba(11,79,47,0.07)",
  imageShade: "rgba(8,17,11,0.34)",
  imageTextMuted: "rgba(255,255,255,0.82)",
  imageTextGhost: "rgba(255,255,255,0.13)",
  imageTextGhostSoft: "rgba(255,255,255,0.12)",
  unsavedHeart: "rgba(0,0,0,0.24)",
  openDot: "#72d99c",
  closedDot: "#efb56d",
  tileTones: ["#164f3b", "#8c4c3f", "#315a70", "#765d26", "#51446d", "#6f3f50"]
};

export const darkColours: typeof lightColours = {
  background: "#000000",
  surface: "#121817",
  elevated: "#222c29",
  statusSurface: "#000000",
  tripSurface: "#121816",
  sheetSurface: "#222c29",
  sheetInset: "#1a2220",
  controlBorder: "#8b9b95",
  focus: "#72d99c",
  primary: "#43c58a",
  primarySoft: "#203c31",
  gold: "#d9b85e",
  coral: "#d7846d",
  success: "#72d99c",
  warning: "#e0ad55",
  closed: "#f49185",
  text: "#edf4ee",
  muted: "#aebbb1",
  border: "#35413956",
  control: "#202a23",
  controlStrong: "#2b372f",
  white: "#ffffff",
  paper: "#101612",
  ink: "#edf4ee",
  green: "#72d99c",
  greenSoft: "#203c2c",
  yellow: "#d9b85e",
  red: "#f49185",
  blue: "#72d99c",
  line: "#354139",
  headerBorder: "rgba(114,217,156,0.22)",
  overlay: "rgba(0,0,0,0.58)",
  overlayStrong: "rgba(0,0,0,0.68)",
  searchOverlay: "rgba(0,0,0,0.62)",
  featureTint: "rgba(114,217,156,0.12)",
  imageShade: "rgba(3,8,5,0.42)",
  imageTextMuted: "rgba(255,255,255,0.82)",
  imageTextGhost: "rgba(255,255,255,0.13)",
  imageTextGhostSoft: "rgba(255,255,255,0.12)",
  unsavedHeart: "rgba(0,0,0,0.38)",
  openDot: "#72d99c",
  closedDot: "#efb56d",
  tileTones: ["#164f3b", "#8c4c3f", "#315a70", "#765d26", "#51446d", "#6f3f50"]
};

export type ThemeColours = typeof lightColours;
export const colours = lightColours;

const themeStorageKey = "knogo.themePreference";
type ThemeValue = { colours: ThemeColours; isDark: boolean; preference: ThemePreference; setPreference: (value: ThemePreference) => void };
export const ThemeContext = createContext<ThemeValue>({ colours: lightColours, isDark: false, preference: "system", setPreference: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const revision = useRef(0);
  const saves = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    const restoreRevision = revision.current;
    void AsyncStorage.getItem(themeStorageKey).then(value => {
      if (active && revision.current === restoreRevision && (value === "system" || value === "light" || value === "dark")) setPreferenceState(value);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const setPreference = (value: ThemePreference) => {
    revision.current += 1;
    setPreferenceState(value);
    saves.current = saves.current.then(() => AsyncStorage.setItem(themeStorageKey, value)).catch(() => undefined);
  };
  const isDark = preference === "dark" || (preference === "system" && system === "dark");
  const value = useMemo(() => ({ colours: isDark ? darkColours : lightColours, isDark, preference, setPreference }), [isDark, preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
export function useThemeStyles<T>(factory: (value: ThemeColours) => T): T {
  const { colours: activeColours } = useTheme();
  return useMemo(() => factory(activeColours), [activeColours, factory]);
}

export const fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  extraBold: "DMSans_800ExtraBold"
} as const;

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

const cornerRadius = 26;
export const radii = {
  tile: cornerRadius, surface: cornerRadius, control: cornerRadius, inset: cornerRadius,
  sheet: cornerRadius + 14,
  check: cornerRadius - 15,
  content: cornerRadius - 16,
  listInset: cornerRadius - 12,
  segment: cornerRadius - 4,
  checkLabel: cornerRadius - 15 - 8,
  indicator: 4,
  nav: 33, navItem: 33 - 5,
  round: 999
} as const;

export const sizes = { touch: 44, control: 52, iconButton: 44 } as const;

export const shadows = {
  card: {
    shadowColor: "#17221b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1
  },
  floating: {
    shadowColor: "#17221b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10
  }
} as const;
