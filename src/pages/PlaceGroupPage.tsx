import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PlaceCard } from "../components/PlaceCard/PlaceCard";
import { usePlaces } from "../state/PlacesContext";
import styles from "./PlaceGroupPage.module.css";

export function PlaceGroupPage() {
  const { groupSlug } = useParams();
  const { placeGroups, places, isSaved, toggleSaved } = usePlaces();
  const group = placeGroups.find((item) => item.slug === groupSlug);
  const branches = group ? places.filter((place) => place.groupId === group.id) : [];

  if (!group) {
    return (
      <div className={styles.empty}>
        <h1>Brand not found</h1>
        <Link to="/restaurants">Back to browse</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/restaurants">
        <ArrowLeft size={18} aria-hidden="true" />
        Restaurants
      </Link>

      <section className={styles.hero}>
        {group.imageUrl ? <img src={group.imageUrl} alt="" /> : null}
        <div>
          <p>Choose a branch</p>
          <h1>{group.name}</h1>
          <span>{branches.length === 1 ? "1 Pretoria East branch" : `${branches.length} Pretoria East branches`}</span>
        </div>
      </section>

      <div className={styles.grid}>
        {branches.map((place) => (
          <PlaceCard key={place.id} place={place} saved={isSaved(place.id)} onToggleSaved={toggleSaved} />
        ))}
      </div>
    </div>
  );
}
