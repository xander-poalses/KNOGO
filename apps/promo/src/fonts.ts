// Font Loading
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

void Promise.all([
  loadFont({
    family: "DM Sans",
    url: staticFile("fonts/DMSans_400Regular.ttf"),
    weight: "400",
  }),
  loadFont({
    family: "DM Sans",
    url: staticFile("fonts/DMSans_500Medium.ttf"),
    weight: "500",
  }),
  loadFont({
    family: "DM Sans",
    url: staticFile("fonts/DMSans_600SemiBold.ttf"),
    weight: "600",
  }),
  loadFont({
    family: "DM Sans",
    url: staticFile("fonts/DMSans_700Bold.ttf"),
    weight: "700",
  }),
  loadFont({
    family: "DM Sans",
    url: staticFile("fonts/DMSans_800ExtraBold.ttf"),
    weight: "800",
  }),
]);
