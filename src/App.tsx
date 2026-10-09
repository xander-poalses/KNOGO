import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell/AppShell";
import { HomePage } from "./pages/HomePage";
import { PlaceDetailPage } from "./pages/PlaceDetailPage";
import { PlaceGroupPage } from "./pages/PlaceGroupPage";
import { RestaurantsPage } from "./pages/RestaurantsPage";
import { SavedPage } from "./pages/SavedPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/restaurants/groups/:groupSlug" element={<PlaceGroupPage />} />
        <Route path="/restaurants/:placeId" element={<PlaceDetailPage />} />
        <Route path="/confirm/:placeId" element={<Navigate to="/restaurants" replace />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
