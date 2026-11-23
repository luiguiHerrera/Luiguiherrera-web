import type { ReactNode } from "react";
import styles from "./dashboard-presentation.module.css";

type DashboardPresentationProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  note: string;
  title: string;
};

export function DashboardPresentation({ children, description, eyebrow, note, title }: DashboardPresentationProps) {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <svg className={styles.ornament} viewBox="0 0 680 300" fill="none" aria-hidden="true" focusable="false" data-dashboard-ornament="decorative">
          {Array.from({ length: 12 }, (_, index) => (
            <path
              key={index}
              d={`M -30 ${210 + index * 5} C 100 ${180 + index * 6}, 116 ${25 + index * 12}, 252 ${65 + index * 10} S 395 ${250 - index * 5}, 510 ${120 + index * 2} S 640 ${18 + index * 8}, 720 ${65 + index * 7}`}
              stroke="currentColor"
              strokeWidth={index === 4 ? 1.5 : 0.7}
              opacity={index === 4 ? 0.65 : 0.18}
            />
          ))}
        </svg>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
          <p className={styles.note}>{note}</p>
        </div>
      </header>
      {children}
    </div>
  );
}
