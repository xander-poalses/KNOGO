import { ArrowLeft, Clock, ExternalLink, Heart, MapPin, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/Badges/StatusBadge";
import { usePlaces } from "../state/PlacesContext";
import { featureLabel, getCheckPresentation } from "@knogo/core/utils/status";
import { getCloseTime } from "@knogo/core/utils/time";
import styles from "./PlaceDetailPage.module.css";

export function PlaceDetailPage() {
  const { placeId } = useParams();
  const { places, isSaved, toggleSaved } = usePlaces();
  const place = places.find((item) => item.id === placeId);

  if (!place) {
    return (
      <div className={styles.empty}>
        <h1>Place not found</h1>
        <Link to="/restaurants">Back to restaurants</Link>
      </div>
    );
  }

  const saved = isSaved(place.id);
  const trading = getCheckPresentation(place.currentStatus);
  const signals = ([["Kitchen", "kitchen_status"], ["Walk-ins", "walk_ins"], ["Vibe", "busy_level"], ["Power", "backup_power"], ["Card", "card_machine"]] as const).map(([label, type]) => {
    const check = getCheckPresentation(place.currentStatus, type);
    return { label, value: check.label, summary: check.summary, timing: check.timing, tone: check.tone === "success" ? "good" : check.tone === "closed" ? "bad" : check.tone };
  });

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/restaurants">
        <ArrowLeft size={18} aria-hidden="true" />
        Back
      </Link>

      <section className={styles.hero}>
        {place.imageUrl ? (
          <figure className={styles.heroImage}>
            <img src={place.imageUrl} alt="" />
          </figure>
        ) : null}

        <div className={styles.heroTop}>
          <StatusBadge status={place.currentStatus} />
        </div>

        <div className={styles.titleBlock}>
          {trading.timing ? <span>{trading.timing}</span> : null}
          <h1>{place.name}</h1>
          <p>
            <MapPin size={16} aria-hidden="true" />
            {place.area} / {place.address}
          </p>
          <p>
            <Clock size={16} aria-hidden="true" />
            {getCloseTime(place.openingHours)}
          </p>
        </div>

        <div className={styles.signals} aria-label="Live status signals">
          {signals.map((signal) => (
            <span aria-label={`${signal.label}: ${signal.summary}`} className={`${styles.signal} ${styles[signal.tone]}`} key={signal.label}>
              <strong>{signal.label}</strong>
              <em>{signal.value}</em>
            </span>
          ))}
        </div>

        {signals.some(signal => signal.timing) ? <details><summary>Report details</summary>{signals.filter(signal => signal.timing).map(signal => <p key={signal.label}>{signal.label}: {signal.summary}</p>)}</details> : null}

        <div className={styles.actions}>
          <a
            className={styles.directionAction}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`}
            target="_blank"
            rel="noreferrer"
          >
            Directions
            <ExternalLink size={16} aria-hidden="true" />
          </a>
          {place.phone ? (
            <a className={styles.callAction} href={`tel:${place.phone.replace(/\s/g, "")}`}>
              Call
              <Phone size={16} aria-hidden="true" />
            </a>
          ) : null}
          <button className={saved ? styles.saved : styles.save} type="button" onClick={() => toggleSaved(place.id)}>
            <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>Hours</h2>
          <div className={styles.hours}>
            {place.openingHours.map((hours) => (
              <div key={hours.day}>
                <span>{hours.day}</span>
                <strong>{hours.isClosed ? "Closed" : `${hours.openTime} to ${hours.closeTime}`}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Kitchen hours</h2>
          {place.kitchenHours?.length ? <div className={styles.hours}>
            {place.kitchenHours.map((hours) => (
              <div key={hours.day}>
                <span>{hours.day}</span>
                <strong>{hours.isClosed ? "Closed" : `${hours.openTime} to ${hours.closeTime}`}</strong>
              </div>
            ))}
          </div> : <p>Kitchen hours have not been published.</p>}
        </section>

        <section className={styles.panel}>
          {place.features.length ? <><h2>Features</h2><div className={styles.features}>
            {place.features.map((feature) => (
              <span key={feature}>{featureLabel(feature)}</span>
            ))}
          </div></> : null}
          <div className={styles.links}>
            {place.website ? (
              <a className={styles.textLink} href={place.website} target="_blank" rel="noreferrer">
                Website
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            ) : null}
            {place.menuUrl ? (
              <a className={styles.textLink} href={place.menuUrl} target="_blank" rel="noreferrer">
                Menu
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
