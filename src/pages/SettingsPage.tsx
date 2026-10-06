import { Bell, ChevronDown, MapPinned, Monitor, Moon, Shield, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlaces } from "../state/PlacesContext";
import styles from "./SettingsPage.module.css";

const themeOptions = [
  { value: "system" as const, label: "System", helper: "Match this device", icon: Monitor },
  { value: "light" as const, label: "Light", helper: "KNOGO default", icon: Sun },
  { value: "dark" as const, label: "Dark", helper: "For low light checks", icon: Moon }
];

export function SettingsPage() {
  const { settings, updateSettings } = usePlaces();
  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeTheme = (event: PointerEvent) => {
      if (!themeRef.current?.contains(event.target as Node)) setThemeOpen(false);
    };

    window.addEventListener("pointerdown", closeTheme);
    return () => window.removeEventListener("pointerdown", closeTheme);
  }, []);

  const toggle = (key: "locationEnabled" | "notificationsEnabled" | "privacyMode") => {
    updateSettings({ ...settings, [key]: !settings[key] });
  };

  const selectedTheme = themeOptions.find((option) => option.value === settings.theme) ?? themeOptions[1];
  const SelectedThemeIcon = selectedTheme.icon;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p>Settings</p>
        <h1>Tune how KNOGO works for you.</h1>
      </header>

      <section className={styles.list}>
        <button className={styles.rowButton} type="button" onClick={() => toggle("locationEnabled")}>
          <MapPinned size={22} aria-hidden="true" />
          <span>
            <strong>Location prompts</strong>
            <small>Off until you choose otherwise</small>
          </span>
          <em>{settings.locationEnabled ? "On" : "Off"}</em>
        </button>
        <button className={styles.rowButton} type="button" onClick={() => toggle("notificationsEnabled")}>
          <Bell size={22} aria-hidden="true" />
          <span>
            <strong>Notifications</strong>
            <small>Local placeholder for future prompts</small>
          </span>
          <em>{settings.notificationsEnabled ? "On" : "Off"}</em>
        </button>
        <button className={styles.rowButton} type="button" onClick={() => toggle("privacyMode")}>
          <Shield size={22} aria-hidden="true" />
          <span>
            <strong>Privacy mode</strong>
            <small>No accounts or live tracking in this MVP</small>
          </span>
          <em>{settings.privacyMode ? "On" : "Off"}</em>
        </button>
        <div className={styles.row} ref={themeRef}>
          <SelectedThemeIcon size={22} aria-hidden="true" />
          <span>
            <strong>Theme</strong>
            <small>{selectedTheme.helper}</small>
          </span>
          <div className={styles.themeSelect}>
            <button type="button" className={styles.selectButton} onClick={() => setThemeOpen((open) => !open)} aria-expanded={themeOpen}>
              {selectedTheme.label}
              <ChevronDown className={themeOpen ? styles.chevronOpen : styles.chevron} size={18} aria-hidden="true" />
            </button>
            {themeOpen ? (
              <div className={styles.selectMenu} role="listbox" aria-label="Theme">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = option.value === settings.theme;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={selected ? styles.optionSelected : ""}
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        updateSettings({ ...settings, theme: option.value });
                        setThemeOpen(false);
                      }}
                    >
                      <Icon size={17} aria-hidden="true" />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.helper}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
