import styles from "./admin.module.css";

type Props = {
  label: string;
  value: string;
  note: string;
};

export function AdminStatCard({ label, value, note }: Props) {
  return (
    <article className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statNote}>{note}</p>
    </article>
  );
}
