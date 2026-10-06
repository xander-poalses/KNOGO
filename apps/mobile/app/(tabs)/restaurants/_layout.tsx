import { Stack } from "expo-router";
import { BrandHeader } from "../../../src/components/AppChrome";
import { useTheme } from "../../../src/theme";

export default function RestaurantsLayout() {
  const { colours } = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colours.background }, header: () => <BrandHeader /> }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="category/[venueType]" />
      <Stack.Screen name="[placeId]" />
      <Stack.Screen name="groups/[groupSlug]" />
    </Stack>
  );
}
