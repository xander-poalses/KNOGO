import { Platform } from "react-native";

export const testerBuild = process.env.EXPO_PUBLIC_APP_ENV === "testing";
export const testerFeedbackEnabled = testerBuild && Platform.OS === "android";
