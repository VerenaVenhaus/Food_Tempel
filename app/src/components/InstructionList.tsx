// Editor für die Anleitung eines Rezepts.
//
// Statt eines großen Multi-Line-Textfelds rendern wir pro Schritt eine
// eigene Zeile: eine unveränderliche "Schritt N:"-Beschriftung links und
// ein Eingabefeld rechts. Am Ende steht immer eine leere Zeile bereit —
// sobald der User dort tippt, taucht automatisch die nächste Zeile auf.
// Enter im Eingabefeld springt zur nächsten Zeile.
//
// Speicherformat: die Schritte werden mit "\n" zu einem einzigen String
// zusammengefügt. So bleibt die DB-Spalte `instructions` (TEXT) unverändert
// und die Detail-Ansicht funktioniert weiter wie bisher.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Props = {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  error?: string;
};

export function InstructionList({ value, onChange, required, error }: Props) {
  // Aktuelle Schritte aus dem zusammengefügten String ableiten.
  // Trailing "" wird unten beim Rendern wieder ergänzt — wir trimmen es hier
  // raus, damit die "echten" Schritte sauber im Array stehen.
  const steps = useMemo(() => {
    if (value === "") return [];
    const parts = value.split("\n");
    while (parts.length > 0 && parts[parts.length - 1].trim() === "") {
      parts.pop();
    }
    return parts;
  }, [value]);

  // Anzeigereihen = echte Schritte + IMMER eine leere Trailing-Zeile.
  // So hat der User stets ein freies Feld unten zum Weiterschreiben.
  const displayRows = useMemo(() => [...steps, ""], [steps]);

  // Refs auf die TextInputs, damit wir bei Enter den Fokus weiterreichen.
  const inputRefs = useRef<Array<TextInput | null>>([]);
  // Wenn wir nach einem Render einen bestimmten Index fokussieren wollen
  // (z.B. nach Enter), merken wir uns das hier und ziehen den Fokus im Effekt.
  const [pendingFocusIdx, setPendingFocusIdx] = useState<number | null>(null);
  // Welche Zeile ist gerade aktiv? Wir lassen sie auf ~4 Textzeilen wachsen,
  // damit längere Schritte gut lesbar zu tippen sind.
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  useEffect(() => {
    if (pendingFocusIdx == null) return;
    // Kleine Verzögerung, damit das neue TextInput definitiv montiert ist.
    const id = setTimeout(() => {
      inputRefs.current[pendingFocusIdx]?.focus();
      setPendingFocusIdx(null);
    }, 0);
    return () => clearTimeout(id);
  }, [pendingFocusIdx, displayRows.length]);

  function emit(nextRows: string[]) {
    // Trailing Empties weg — wir wollen kein "Schritt eins\n" in der DB,
    // sondern nur die echten Schritte.
    const cleaned = [...nextRows];
    while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === "") {
      cleaned.pop();
    }
    onChange(cleaned.join("\n"));
  }

  function setRow(idx: number, text: string) {
    const next = [...displayRows];
    next[idx] = text;
    emit(next);
  }

  function removeRow(idx: number) {
    const next = displayRows.filter((_, i) => i !== idx);
    emit(next);
  }

  function onSubmitRow(idx: number) {
    // Nächste Zeile fokussieren. Falls der User in der vorletzten Zeile
    // war, ist die Trailing-Empty schon da. Falls er mittendrin war,
    // springt der Fokus zur nächsten existierenden Zeile.
    setPendingFocusIdx(idx + 1);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Anleitung
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {displayRows.map((text, idx) => {
        const isTrailing = idx === displayRows.length - 1;
        const isFocused = focusedIdx === idx;
        return (
          <View key={idx} style={styles.row}>
            <Text style={styles.stepLabel}>Schritt {idx + 1}:</Text>
            <TextInput
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              value={text}
              onChangeText={(t) => setRow(idx, t)}
              onSubmitEditing={() => onSubmitRow(idx)}
              onFocus={() => setFocusedIdx(idx)}
              // Nur löschen, wenn dieser Index noch der aktive ist — sonst
              // verschluckt onBlur einen direkt darauf folgenden onFocus
              // auf einem anderen Feld.
              onBlur={() =>
                setFocusedIdx((prev) => (prev === idx ? null : prev))
              }
              // Multiline + submitBehavior="submit": Enter springt zum nächsten
              // Schritt (statt einen Zeilenumbruch IM Schritt einzufügen).
              // Beim Fokus dehnt sich das Feld auf 4 Zeilen Mindesthöhe aus.
              multiline
              submitBehavior="submit"
              textAlignVertical="top"
              returnKeyType="next"
              placeholder={
                idx === 0 ? "z.B. Mehl mit Wasser verrühren…" : "weiter…"
              }
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                isFocused && styles.inputFocused,
                error && idx === 0 && styles.inputError,
              ]}
            />
            {/* X-Button nur bei echten (nicht trailing) Zeilen */}
            {!isTrailing && (
              <Pressable
                onPress={() => removeRow(idx)}
                hitSlop={8}
                style={styles.removeButton}
                accessibilityLabel={`Schritt ${idx + 1} entfernen`}
              >
                <Text style={styles.removeIcon}>✕</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  required: {
    color: colors.danger,
  },
  row: {
    flexDirection: "row",
    // Top statt center — sonst springt das Label optisch nach unten,
    // sobald das Feld bei Fokus auf 4 Zeilen ausklappt.
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  stepLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    width: 72, // einheitliche Breite, damit die Inputs untereinander bündig sind
    // Padding entspricht dem Padding des TextInputs, damit Label und
    // erste Textzeile auf gleicher Höhe stehen.
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    minHeight: 40,
    outlineStyle: "none" as never,
  },
  // Beim Fokus: ~4 Textzeilen sichtbar. Die genaue Höhe ergibt sich aus
  // fontSize × ~1.4 Zeilenhöhe × 4 Zeilen + Padding.
  inputFocused: {
    minHeight: 110,
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.danger,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.surface,
    // Etwas Padding oben, damit der Button auf Augenhöhe mit dem Label sitzt
    // (statt bei großem Eingabefeld mitzuwachsen).
    marginTop: 4,
  },
  removeIcon: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
