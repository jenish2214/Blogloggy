import styles from "./admin.module.css";

type Props = {
  title: string;
  description: string;
};

export function AdminPlaceholder({ title, description }: Props) {
  return (
    <>
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Admin module</p>
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className={styles.pageDesc}>{description}</p>
      </header>

      <div className={styles.placeholderBanner}>
        <div>
          <p className={styles.placeholderBannerTitle}>Coming in Phase 2</p>
          <p className={styles.placeholderBannerDesc}>
            This module shell is ready. Data management and CRUD operations will be wired in the next phase.
          </p>
        </div>
      </div>

      <div className={styles.placeholderBody}>
        <p>Module content will appear here once connected to admin APIs.</p>
      </div>
    </>
  );
}
