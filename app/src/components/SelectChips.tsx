// Auswahl per Chips — wahlweise Einzel- oder Mehrfachauswahl.
// Praktisch für Mahlzeitentyp (genau einer) und Tags (mehrere).
//
// Generic <T extends string>: so kann der Caller die Werte typsicher
// beschränken (z.B. nur die Enum-Werte "breakfast" | "lunch" | ...).

import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Option<T extends string> = {
  value: T;
  label: string;
};

// Zwei Varianten der Komponente — einmal Einzel-, einmal Mehrfachauswahl.
// Das macht die Verwendung typsicher: bei multiSelect={true} ist value ein
// Array, bei multiSelect={false} ein Einzelwert.
type SingleProps<T extends string> = {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (next: T | null) => void;
  multiSelect?: false;
  allowDeselect?: boolean;
};

type MultiProps<T extends string> = {
  label?: string;
  options: Option<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  multiSelect: true;
};

export function SelectChips<T extends string>(props: SingleProps<T> | MultiProps<T>) {
  return (
    <View style={styles.container}>
      {props.label && <Text style={styles.label}>{props.label}</Text>}
      <View style={styles.chipRow}>
        {props.options.map((option) => {
          const selected = props.multiSelect
            ? props.value.includes(option.value)
            : props.value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                if (props.multiSelect) {
                  const set = new Set(props.value);
                  if (selected) set.delete(option.value);
                  else set.add(option.value);
                  props.onChange(Array.from(set));
                } else {
                  // Bei Single-Select: ein nochmaliges Tappen des aktiven Chips
                  // löscht die Auswahl, wenn allowDeselect=true (Standard).
                  if (selected && (props.allowDeselect ?? true)) {
                    props.onChange(null);
                  } else {
                    props.onChange(option.value);
                  }
                }
              }}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: fontWeight.semibold,
  },
});
