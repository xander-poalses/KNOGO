import { Clock, Heart, MapPin } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Place } from "@knogo/core/types/place";
import { featureLabel, getCheckPresentation } from "@knogo/core/utils/status";
import { getCloseTime } from "@knogo/core/utils/time";
import styles from "./PlaceCard.module.css";

type Props = {
  place: Place;
  saved: boolean;
  onToggleSaved: (placeId: string) => void;
};

export function PlaceCard({ place, saved, onToggleSaved }: Props) {
  const navigate = useNavigate();
  const trading = getCheckPresentation(place.currentStatus);
  const signals = ([["Walk-ins", "walk_ins"], ["Vibe", "busy_level"], ["Power", "backup_power"], ["Card", "card_machine"]] as const).map(([label, type]) => {
    const check = getCheckPresentation(place.currentStatus, type);
    return { label, value: check.label, summary: check.summary, tone: check.tone === "success" ? "good" : check.tone === "closed" ? "bad" : check.tone };
  });
  const features = place.features.slice(0, 2).map((feature) => featureLabel(feature));

  const openDetails = () => navigate(`/restaurants/${place.id}`);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails();
    }
  };

  const stopCardClick = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

  return (
    <article
      className={styles.card}
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
      aria-label={`View details for ${place.name}`}
    >
      <div className={styles.topline}>
        <span className={styles.confirmed}>{trading.summary}</span>
      </div>

      <div>
        <h2>{place.name}</h2>
        <p className={styles.meta}>
          <MapPin size={15} aria-hidden="true" />
          {place.area} / {place.cuisine.join(", ")}
        </p>
      </div>

      <div className={styles.info}>
        <span>
          <Clock size={15} aria-hidden="true" />
          {getCloseTime(place.openingHours)}
        </span>
      </div>

      <div className={styles.signals} aria-label="Live status signals">
        {signals.map((signal) => (
          <span aria-label={`${signal.label}: ${signal.summary}`} title={signal.summary} className={`${styles.signal} ${styles[signal.tone]}`} key={signal.label}>
            <strong>{signal.label}</strong>
            <em>{signal.value}</em>
          </span>
        ))}
      </div>

      <div className={styles.features} aria-label="Place features">
        {features.map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
      </div>

      <div className={styles.actions}>
        <Link className={styles.confirmAction} to={`/restaurants/${place.id}`} onClick={stopCardClick}>
          View details
        </Link>
        <button
          className={saved ? styles.saved : styles.save}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSaved(place.id);
          }}
          aria-label={saved ? "Remove from saved" : "Save place"}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
