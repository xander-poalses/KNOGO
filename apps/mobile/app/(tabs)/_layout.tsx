import { Tabs, useRouter } from "expo-router";
import { Compass, Home, Settings, Heart } from "lucide-react-native";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { HapticPressable as Pressable } from "../../src/components/HapticPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandHeader } from "../../src/components/AppChrome";
import { radii, fonts, shadows, useTheme, useThemeStyles, type ThemeColours } from "../../src/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colours } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const tabWidth = Math.min(windowWidth - 20, 700);

  return (
    <Tabs
      tabBar={({ state, descriptors, emitter, navigateToTab }) => (
        <View style={[styles.tabDock, { paddingBottom: 12 + insets.bottom }]}>
          <View style={[styles.tabBar, { width: tabWidth }]}>
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const options = descriptors[route.key].options;
              const label = typeof options.title === "string" ? options.title : route.name;
              const Icon = route.name === "index"
                ? Home
                : route.name === "restaurants"
                  ? Compass
                  : route.name === "saved"
                    ? Heart
                    : Settings;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  key={route.key}
                  onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
                  onPress={() => {
                    const event = emitter.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true
                    });

                    if (!event.defaultPrevented && route.name === "restaurants") {
                      router.replace("/restaurants");
                    } else if (!focused && !event.defaultPrevented) {
                      navigateToTab(route.key);
                    }
                  }}
                  style={[styles.tabItem, focused && styles.tabItemActive]}
                >
                  <Icon color={focused ? colours.background : colours.muted} size={21} strokeWidth={2.2} />
                  <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      screenOptions={{
        header: () => <BrandHeader />,
        sceneStyle: { backgroundColor: colours.background }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="restaurants" options={{ title: "Explore", headerShown: false, tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: ({ color, size }) => <Heart color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tabs>
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  tabDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 12,
    backgroundColor: colours.background,
    shadowColor: colours.background,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10
  },
  tabBar: {
    height: 66,
    padding: 5,
    flexDirection: "row",
    borderRadius: radii.nav,
    backgroundColor: colours.surface,
    ...shadows.floating
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    borderRadius: radii.navItem,
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  tabItemActive: { backgroundColor: colours.primary },
  tabLabel: { width: "100%", color: colours.muted, fontFamily: fonts.medium, fontSize: 10, textAlign: "center" },
  tabLabelActive: { color: colours.background }
});
