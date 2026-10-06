import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BusyLevel, PlaceFilters } from "@knogo/core/types/place";
import { defaultFilters } from "@knogo/core/utils/filters";
import styles from "./FilterPanel.module.css";

type Props = {
  filters: PlaceFilters;
  areas: string[];
  cuisines: string[];
  onChange: (filters: PlaceFilters) => void;
  onClear: () => void;
};

const busyOptions: Array<{ value: BusyLevel | "any"; label: string }> = [
  { value: "any", label: "Any vibe" },
  { value: "quiet", label: "Quiet" },
  { value: "normal", label: "Normal" },
  { value: "busy", label: "Busy" },
  { value: "packed", label: "Packed" }
];

type DropdownOption<T extends string> = {
  value: T;
  label: string;
};

type DropdownProps<T extends string> = {
  label: string;
  value: T;
  options: Array<DropdownOption<T>>;
  onChange: (value: T) => void;
};

function CustomDropdown<T extends string>({ label, value, options, onChange }: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div className={styles.field} ref={rootRef}>
      <span id={id}>{label}</span>
      <div className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ""}`}>
        <button
          className={styles.dropdownButton}
          type="button"
          aria-label={`${label}: ${selected.label}`}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span>{selected.label}</span>
          <ChevronDown className={styles.dropdownChevron} size={17} aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className={styles.dropdownMenu} role="listbox" aria-labelledby={id}>
            {options.map((option) => (
              <button
                className={option.value === value ? styles.optionSelected : ""}
                type="button"
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FilterPanel({ filters, areas, cuisines, onChange, onClear }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const set = <K extends keyof PlaceFilters>(key: K, value: PlaceFilters[K]) => onChange({ ...filters, [key]: value });
  const toggleMany = (key: "areas" | "cuisines", value: string) => {
    const current = filters[key];
    set(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };
  const activeCount = useMemo(
    () => (filters.areas.length ? 1 : 0) + (filters.cuisines.length ? 1 : 0) +
      (Object.keys(defaultFilters) as Array<keyof PlaceFilters>).filter((key) => !["query", "areas", "cuisines"].includes(key) && filters[key] !== defaultFilters[key]).length,
    [filters]
  );

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <section className={styles.panel} aria-label="Restaurant filters">
      <div className={styles.launcher}>
        <button className={styles.toggle} type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>Filters</span>
          <em>{activeCount ? `${activeCount} active` : ""}</em>
          <ChevronDown className={isOpen ? styles.chevronOpen : styles.chevron} size={18} aria-hidden="true" />
        </button>
        {activeCount ? (
          <button className={styles.clear} type="button" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
        <div className={styles.overlay} onMouseDown={() => setIsOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Filters" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalTop}>
              <div>
                <span>Restaurant filters</span>
                <h2>Refine the room.</h2>
              </div>
              <button className={styles.close} type="button" onClick={() => setIsOpen(false)} aria-label="Close filters">
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.controlGroup}><span className={styles.groupLabel}>Areas</span><div className={styles.chips}>
                <button type="button" className={filters.areas.length === 0 ? styles.selected : ""} onClick={() => set("areas", [])}>{filters.areas.length === 0 ? <Check size={14} /> : null}All areas</button>
                {areas.map((area) => <button type="button" key={area} className={filters.areas.includes(area) ? styles.selected : ""} onClick={() => toggleMany("areas", area)}>{filters.areas.includes(area) ? <Check size={14} /> : null}{area}</button>)}
              </div></div>

              <div className={styles.controlGroup}>
                <span className={styles.groupLabel}>Availability</span>
                <div className={styles.chips}>
                  <button type="button" className={filters.openNow ? styles.selected : ""} onClick={() => set("openNow", !filters.openNow)}>
                    Open now
                  </button>
                  <button
                    type="button"
                    className={filters.openAfter === "20:00" ? styles.selected : ""}
                    onClick={() => set("openAfter", filters.openAfter === "20:00" ? "none" : "20:00")}
                  >
                    After 20:00
                  </button>
                  <button
                    type="button"
                    className={filters.openAfter === "21:00" ? styles.selected : ""}
                    onClick={() => set("openAfter", filters.openAfter === "21:00" ? "none" : "21:00")}
                  >
                    After 21:00
                  </button>
                  <button
                    type="button"
                    className={filters.kitchenServing ? styles.selected : ""}
                    onClick={() => set("kitchenServing", !filters.kitchenServing)}
                  >
                    Serving
                  </button>
                  <button type="button" className={filters.walkIns ? styles.selected : ""} onClick={() => set("walkIns", !filters.walkIns)}>
                    Walk-ins
                  </button>
                  <button
                    type="button"
                    className={filters.backupPower ? styles.selected : ""}
                    onClick={() => set("backupPower", !filters.backupPower)}
                  >
                    Backup power
                  </button>
                  <button
                    type="button"
                    className={filters.cardWorking ? styles.selected : ""}
                    onClick={() => set("cardWorking", !filters.cardWorking)}
                  >
                    Card working
                  </button>
                </div>
              </div>

              <CustomDropdown label="Busy level" value={filters.busyLevel} options={busyOptions} onChange={(value) => set("busyLevel", value)} />

              <div className={styles.controlGroup}><span className={styles.groupLabel}>Cuisines</span><div className={styles.chips}>
                <button type="button" className={filters.cuisines.length === 0 ? styles.selected : ""} onClick={() => set("cuisines", [])}>{filters.cuisines.length === 0 ? <Check size={14} /> : null}All cuisines</button>
                {cuisines.map((cuisine) => <button type="button" key={cuisine} className={filters.cuisines.includes(cuisine) ? styles.selected : ""} onClick={() => toggleMany("cuisines", cuisine)}>{filters.cuisines.includes(cuisine) ? <Check size={14} /> : null}{cuisine}</button>)}
              </div></div>

            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={onClear}>
                Reset
              </button>
              <button type="button" onClick={() => setIsOpen(false)}>
                Show places
              </button>
            </div>
          </div>
        </div>,
          document.body
        )
        : null}
    </section>
  );
}
