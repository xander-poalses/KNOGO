import { ArrowRight, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HomePage.module.css";

export function HomePage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    navigate(`/restaurants?${params.toString()}`);
  };

  return (
    <div className={styles.page}>
      <img className={styles.communityImage} src="/community-meerkats-1.svg" alt="" aria-hidden="true" />
      <form className={styles.searchPanel} onSubmit={submitSearch}>
        <h1>Peek before you go?</h1>
        <div className={styles.searchBox}>
          <Search size={24} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search here..."
            aria-label="Search places"
            autoFocus
          />
          <button type="submit" aria-label="Search">
            <ArrowRight size={24} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
