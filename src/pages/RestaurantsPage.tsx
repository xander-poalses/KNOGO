import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilterPanel } from "../components/FilterPanel/FilterPanel";
import { PlaceCard } from "../components/PlaceCard/PlaceCard";
import { PlaceGroupCard } from "../components/PlaceGroupCard/PlaceGroupCard";
import { SearchBar } from "../components/SearchBar/SearchBar";
import { usePlaces } from "../state/PlacesContext";
import { defaultFilters, filterPlaces, getCuisineOptions } from "@knogo/core/utils/filters";
import styles from "./RestaurantsPage.module.css";

const categories = [
  { id: "restaurant", title: "Restaurants", body: "Sit-down meals, table service and full menus", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=85", heading: "Tables with a pulse." },
  { id: "quick_bites", title: "Quick Bites", body: "Fast food, coffee, bakeries, desserts and takeaway", image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1000&q=85", heading: "Good food, less waiting." },
  { id: "bar", title: "Bars", body: "Drinks, social spots and nightlife", image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=85", heading: "Find your next round." }
] as const;

export function RestaurantsPage() {
  const { places, placeGroups, isSaved, toggleSaved } = usePlaces();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = categories.find((category) => category.id === searchParams.get("category"));
  const [filters, setFilters] = useState({
    ...defaultFilters,
    query: searchParams.get("q") ?? defaultFilters.query,
    openAfter: searchParams.get("openAfter") === "20:00" ? "20:00" : defaultFilters.openAfter
  });
  const categoryPlaces = useMemo(() => selectedCategory ? places.filter((place) => place.category === selectedCategory.id) : [], [places, selectedCategory]);
  const filteredPlaces = useMemo(() => filterPlaces(categoryPlaces, filters), [categoryPlaces, filters]);
  const groupedResults = useMemo(
    () =>
      placeGroups
        .map((group) => ({
          group,
          branches: filteredPlaces.filter((place) => place.groupId === group.id)
        }))
        .filter((item) => item.branches.length > 0),
    [filteredPlaces, placeGroups]
  );
  const ungroupedResults = useMemo(() => filteredPlaces.filter((place) => !place.groupId), [filteredPlaces]);
  const resultCount = placeGroups.length ? groupedResults.length + ungroupedResults.length : filteredPlaces.length;
  const areas = useMemo(() => Array.from(new Set(categoryPlaces.map((place) => place.area))).sort(), [categoryPlaces]);
  const cuisines = useMemo(() => getCuisineOptions(categoryPlaces), [categoryPlaces]);

  const chooseCategory = (category: typeof categories[number]) => {
    const next = new URLSearchParams(searchParams);
    next.set("category", category.id);
    setSearchParams(next);
  };

  if (!selectedCategory) {
    return (
      <div className={`${styles.page} ${styles.pickerPage}`}>
        <header className={styles.header}>
          <p>Browse</p>
          <h1>What are you looking for?</h1>
        </header>

        <section className={styles.categories} aria-label="Place categories">
          {categories.map((category) => (
            <button key={category.id} className={styles.categoryTile} type="button" onClick={() => chooseCategory(category)}>
              <img src={category.image} alt="" /><span>Live now</span><strong>{category.title}</strong>
              <em>{category.body}<ArrowRight size={18} aria-hidden="true" /></em>
            </button>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.categoryBack} type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.delete("category"); setSearchParams(next); }}>Choose category</button>
        <p>{selectedCategory.title}</p>
        <h1>{selectedCategory.heading}</h1>
        <SearchBar value={filters.query} onChange={(query) => setFilters({ ...filters, query })} />
      </header>

      <figure className={styles.foodImage}>
        <img src={selectedCategory.image} alt="" />
      </figure>

      <div className={styles.layout}>
        <aside className={styles.filters}>
          <FilterPanel
            filters={filters}
            areas={areas}
            cuisines={cuisines}
            onChange={setFilters}
            onClear={() => setFilters({ ...defaultFilters, query: filters.query })}
          />
        </aside>
        <section className={styles.results} aria-label={`${selectedCategory.title} results`}>
          <div className={styles.resultHead}>
            <span>Results</span>
            <strong>
              {resultCount}{" "}
              {placeGroups.length ? "names" : "places"}
            </strong>
          </div>
          {placeGroups.length && (groupedResults.length || ungroupedResults.length) ? (
            <div className={styles.grid}>
              {groupedResults.map(({ group, branches }) => (
                <PlaceGroupCard key={group.id} group={group} branches={branches} />
              ))}
              {ungroupedResults.map((place) => (
                <PlaceCard key={place.id} place={place} saved={isSaved(place.id)} onToggleSaved={toggleSaved} />
              ))}
            </div>
          ) : filteredPlaces.length ? (
            <div className={styles.grid}>
              {filteredPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} saved={isSaved(place.id)} onToggleSaved={toggleSaved} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <h2>No matches yet</h2>
              <p>Try fewer filters or search another area or cuisine.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
