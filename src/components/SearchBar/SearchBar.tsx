import { Search } from "lucide-react";
import styles from "./SearchBar.module.css";

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.search}>
      <Search size={18} aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search by place, area, or cuisine" />
    </label>
  );
}
