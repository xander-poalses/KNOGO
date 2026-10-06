import type { LiveStatus } from "@knogo/core/types/place";
import { getCheckPresentation, getStatusTone } from "@knogo/core/utils/status";
import styles from "./Badges.module.css";

export function StatusBadge({ status }: { status: LiveStatus }) {
  const check = getCheckPresentation(status);
  return <span aria-label={check.summary} title={check.summary} className={`${styles.badge} ${styles[getStatusTone(status)]}`}>{check.label}</span>;
}
