import { ChevronDown, Compass, Home, Info, Settings, Star } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./AppShell.module.css";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/restaurants", label: "Browse", icon: Compass },
  { to: "/saved", label: "Saved", icon: Star },
  { to: "/settings", label: "Settings", icon: Settings }
];

function getActiveIndex(pathname: string) {
  if (pathname.startsWith("/restaurants") || pathname.startsWith("/confirm")) return 1;
  if (pathname.startsWith("/saved")) return 2;
  if (pathname.startsWith("/settings")) return 3;
  return 0;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [betaOpen, setBetaOpen] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const category = new URLSearchParams(location.search).get("category");
  const isCategoryPicker = location.pathname === "/restaurants" && !["restaurant", "quick_bites", "bar"].includes(category ?? "");
  const activeIndex = getActiveIndex(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const updateCanScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight > 24;
      const awayFromEnd = window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 24;
      setCanScroll(!isHome && !isCategoryPicker && scrollable && awayFromEnd);
    };

    updateCanScroll();
    const frame = window.requestAnimationFrame(updateCanScroll);
    const timer = window.setTimeout(updateCanScroll, 500);
    window.addEventListener("scroll", updateCanScroll, { passive: true });
    window.addEventListener("resize", updateCanScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("scroll", updateCanScroll);
      window.removeEventListener("resize", updateCanScroll);
    };
  }, [isHome, isCategoryPicker, location.pathname, location.search]);

  const scrollForward = () => {
    const target = Math.min(
      document.documentElement.scrollHeight - window.innerHeight,
      window.scrollY + Math.max(window.innerHeight * 0.72, 420)
    );
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <div className={[styles.shell, isHome ? styles.homeShell : "", isCategoryPicker ? styles.pickerShell : ""].filter(Boolean).join(" ")}>
      <header className={styles.topBar}>
        <NavLink to="/" className={styles.brand} aria-label="KNOGO home">
          <span className={styles.brandIdentity}>
            <img className={styles.mascotImage} src="/knogo-mascot.svg" alt="" aria-hidden="true" />
            <img className={styles.logoImage} src="/knogo-logo.svg" alt="KNOGO" />
          </span>
          <span className={styles.tagline}>Know before you go.</span>
        </NavLink>
        <nav className={styles.desktopNav} aria-label="Primary">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={index === activeIndex ? styles.active : styles.link}>
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main className={styles.main}>
        <div key={location.pathname} className={styles.routeFrame}>
          {children}
        </div>
      </main>
      <div className={styles.betaWrap}>
        {betaOpen ? (
          <div className={styles.betaPopup} role="status">
            KNOGO is in beta. For now, food and drink spots in Pretoria East are available.
          </div>
        ) : null}
        <button className={styles.betaButton} type="button" onClick={() => setBetaOpen((current) => !current)} aria-expanded={betaOpen}>
          <Info size={18} aria-hidden="true" />
        </button>
      </div>
      {canScroll ? (
        <button className={styles.scrollCue} type="button" onClick={scrollForward} aria-label="Scroll down">
          <ChevronDown size={22} aria-hidden="true" />
        </button>
      ) : null}
      <nav className={styles.mobileNav} style={{ "--active-index": activeIndex } as React.CSSProperties} aria-label="Primary">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={index === activeIndex ? styles.mobileActive : styles.mobileLink}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
