const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const testing = { testerBuild: false };
const Box = ({ children }) => React.createElement("div", null, children);
jest.mock("../../apps/mobile/src/testing", () => testing);
jest.mock("react-native", () => ({ View: Box, Text: Box, StyleSheet: { create: value => value } }), { virtual: true });
jest.mock("lucide-react-native", () => ({ Info: () => null }), { virtual: true });
jest.mock("expo-image", () => ({ Image: () => null }), { virtual: true });
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0 }) }), { virtual: true });
jest.mock("../../apps/mobile/src/components/HapticPressable", () => ({ HapticPressable: Box }));
jest.mock("../../apps/mobile/src/components/FeedbackToast", () => ({ FeedbackToast: () => null }));
jest.mock("../../apps/mobile/src/components/Ui", () => ({ Page: Box, BackButton: () => null }));
jest.mock("../../apps/mobile/src/components/OutsideVoiceLogo", () => ({ OutsideVoiceLogo: () => null }));
jest.mock("../../apps/mobile/src/theme", () => ({ fonts: {}, useTheme: () => ({ colours: {} }), useThemeStyles: fn => fn({}) }));
jest.mock("../../apps/mobile/src/state/PlacesContext", () => ({ usePlaces: () => ({ places: [], loading: false, error: null }) }));
jest.mock("../../apps/mobile/assets/knogo-mascot.png", () => "mascot");
jest.mock("../../apps/mobile/assets/knogo-logo.png", () => "logo");
const { BrandHeader } = require("../../apps/mobile/src/components/AppChrome");
const { LegalScreen } = require("../../apps/mobile/src/screens/LegalScreen");

describe.each(["testing", "production", "development", undefined])("notice placement in %s", environment => {
  beforeEach(() => { testing.testerBuild = environment === "testing"; });
  test("keeps the environment notice out of the header", () => {
    expect(renderToStaticMarkup(React.createElement(BrandHeader))).not.toContain("Test environment");
  });
  test("shows the environment notice in privacy only for testers", () => {
    const markup = renderToStaticMarkup(React.createElement(LegalScreen));
    expect(markup.includes("Test environment")).toBe(environment === "testing");
    if (environment === "testing") {
      expect(markup).toContain("You are using the KNOGO test environment.");
      expect(markup).toContain("Reports submitted here are for testing");
    }
  });
});
