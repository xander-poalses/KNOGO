import { ArrowRight, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { KeyboardEvent } from "react";
import type { Place, PlaceGroup } from "@knogo/core/types/place";
import styles from "./PlaceGroupCard.module.css";

type Props = {
  group: PlaceGroup;
  branches: Place[];
};

export function PlaceGroupCard({ group, branches }: Props) {
  const navigate = useNavigate();
  const branchAreas = Array.from(new Set(branches.map((place) => place.area))).slice(0, 3);
  const branchCount = branches.length;
  const imageUrl = group.imageUrl ?? branches.find((branch) => branch.imageUrl)?.imageUrl;

  const openGroup = () => navigate(`/restaurants/groups/${group.slug}`);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGroup();
    }
  };

  return (
    <article
      className={styles.card}
      role="link"
      tabIndex={0}
      onClick={openGroup}
      onKeyDown={handleKeyDown}
      aria-label={`View ${group.name} branches`}
    >
      {imageUrl ? <img className={styles.image} src={imageUrl} alt="" loading="lazy" /> : null}
      <div className={styles.body}>
        <span className={styles.kicker}>{branchCount === 1 ? "1 branch" : `${branchCount} branches`}</span>
        <h2>{group.name}</h2>
        <p>{group.description ?? "Check live status before you choose a branch."}</p>
        <div className={styles.meta}>
          <MapPin size={16} aria-hidden="true" />
          <span>{branchAreas.join(" / ")}</span>
        </div>
        <strong className={styles.action}>
          View branches
          <ArrowRight size={18} aria-hidden="true" />
        </strong>
      </div>
    </article>
  );
}
