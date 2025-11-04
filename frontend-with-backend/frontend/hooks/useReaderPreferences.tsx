import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TextStyle } from "react-native";
import { Colors } from "@/constants/Colors";
import { useTheme } from "./useTheme";

export type LineHeightOpt = "Compact" | "Normal" | "Spacious";
export type AlignOpt = "Left" | "Center" | "Justify";

export interface ReaderPrefs {
   fontSize: number;
   lineHeight: LineHeightOpt;
   textAlignment: AlignOpt;
}

export const READER_SETTINGS_KEY = "easyread.settings.v1";

const DEFAULT_PREFS: ReaderPrefs = {
   fontSize: 16,
   lineHeight: "Normal",
   textAlignment: "Left",
};

/**
 * Low-level hook: load & update reader prefs.
 * Use this in Settings screen or anywhere you need to *change* prefs.
 */
export function useReaderPreferences() {
   const [prefs, setPrefsState] = useState<ReaderPrefs>(DEFAULT_PREFS);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      let cancelled = false;

      (async () => {
         try {
            const raw = await AsyncStorage.getItem(READER_SETTINGS_KEY);
            if (!raw) {
               setLoading(false);
               return;
            }
            const parsed = JSON.parse(raw);
            if (cancelled) return;

            setPrefsState((prev) => ({
               fontSize:
                  typeof parsed.fontSize === "number"
                     ? parsed.fontSize
                     : prev.fontSize,
               lineHeight:
                  (parsed.lineHeight as LineHeightOpt) || prev.lineHeight,
               textAlignment:
                  (parsed.textAlignment as AlignOpt) || prev.textAlignment,
            }));
         } catch {
            // ignore and use defaults
         } finally {
            if (!cancelled) setLoading(false);
         }
      })();

      return () => {
         cancelled = true;
      };
   }, []);

   const setPrefs = async (next: Partial<ReaderPrefs>) => {
      setPrefsState((prev) => {
         const merged: ReaderPrefs = { ...prev, ...next };
         AsyncStorage.setItem(
            READER_SETTINGS_KEY,
            JSON.stringify(merged)
         ).catch(() => {});
         return merged;
      });
   };

   return { prefs, setPrefs, loading };
}

/**
 * High-level hook: returns a ready-to-use textStyle for Easy Read
 * and still exposes prefs if you need them.
 */
export function useReaderTextStyle() {
   const { theme } = useTheme();
   const { prefs, setPrefs, loading } = useReaderPreferences();

   const textStyle: TextStyle = useMemo(() => {
      const lhFactor =
         prefs.lineHeight === "Compact"
            ? 1.2
            : prefs.lineHeight === "Spacious"
            ? 1.8
            : 1.5;

      const lineHeight = Math.round(prefs.fontSize * lhFactor);

      const textAlign =
         prefs.textAlignment === "Center"
            ? "center"
            : prefs.textAlignment === "Justify"
            ? "justify"
            : "left";

      return {
         fontSize: prefs.fontSize,
         lineHeight,
         textAlign,
         color: Colors[theme].text,
      };
   }, [prefs.fontSize, prefs.lineHeight, prefs.textAlignment, theme]);

   return { textStyle, prefs, setPrefs, loading };
}
