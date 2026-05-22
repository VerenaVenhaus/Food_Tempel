// Stack-Navigator: definiert die Bildschirme der eingeloggten App.
//
// Layout im Header der Hauptseite:
//   [Logo + "Food_Tempel"]  ............  [☰ Menü]
//
// Das ☰-Menü öffnet ein Slide-Modal von rechts mit:
//   - Konto-Info
//   - "Rezept erstellen"
//   - "Abmelden"

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { ProfileMenu } from "../components/ProfileMenu";
import { FilterScreen } from "../screens/FilterScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { RecipeDetailScreen } from "../screens/RecipeDetailScreen";
import { RecipeFormScreen } from "../screens/RecipeFormScreen";
import { colors, fontSize, fontWeight, radius } from "../theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Logo + Titel als kombinierte Komponente für den Header.
// require() braucht statische Pfade — der Bundler löst sie zur Compile-Zeit auf.
function HeaderBrand() {
  return (
    <View style={styles.brand}>
      <Image
        source={require("../../assets/koala.jpg")}
        style={styles.logo}
        resizeMode="cover"
      />
      <Text style={styles.brandText}>Food_Tempel</Text>
    </View>
  );
}

export function AppNavigator() {
  // Sichtbarkeit des Menüs lokal im Navigator — beim ☰-Tap auf true setzen.
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.navbarBg },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            // headerTitle als Custom-Komponente: ersetzt den normalen Text-Titel
            headerTitle: HeaderBrand,
            // headerLeft auf null setzen, damit das Logo links anliegt
            // und kein Default-Back-Pfeil erscheint (gibt's auf Home eh nicht).
            headerLeft: () => null,
            headerRight: () => (
              <Pressable
                onPress={() => setMenuVisible(true)}
                hitSlop={12}
                accessibilityLabel="Menü öffnen"
              >
                <Text style={styles.headerIcon}>☰</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen
          name="RecipeDetail"
          component={RecipeDetailScreen}
          options={{ title: "Rezept" }}
        />
        <Stack.Screen
          name="RecipeForm"
          component={RecipeFormScreen}
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="Filter"
          component={FilterScreen}
          options={{ title: "Filter", presentation: "modal" }}
        />
      </Stack.Navigator>

      <ProfileMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
  },
  brandText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  headerIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    paddingHorizontal: 8,
  },
});
