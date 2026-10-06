import { getConfidenceLevel, getConfidenceLabel } from "@knogo/core/utils/status";
import styles from "./Badges.module.css";

export function ConfidenceBadge({ score }: { score: number }) {
  const level = getConfidenceLevel(score);
  return (
    <span className={`${styles.confidence} ${styles[level]}`}>
      {getConfidenceLabel(score)}
    </span>
  );
}
