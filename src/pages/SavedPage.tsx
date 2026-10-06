import { Link } from "react-router-dom";
import { PlaceCard } from "../components/PlaceCard/PlaceCard";
import { usePlaces } from "../state/PlacesContext";
import styles from "./SavedPage.module.css";

export function SavedPage() {
  const { places, savedPlaceIds, isSaved, toggleSaved } = usePlaces();
  const savedPlaces = places.filter((place) => savedPlaceIds.includes(place.id));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p>Saved</p>
        <h1>Your places to check first.</h1>
      </header>

      {savedPlaces.length ? (
        <div className={styles.grid}>
          {savedPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} saved={isSaved(place.id)} onToggleSaved={toggleSaved} />
          ))}
        </div>
      ) : (
        <section className={styles.empty}>
          <h2>No saved places yet</h2>
          <p>Save places you want to check before heading out.</p>
          <Link to="/restaurants">Browse restaurants</Link>
        </section>
      )}
    </div>
  );
}
