import styles from "./trends.module.css";

// Decorative editorial photographs. Sources and reuse terms are retained with the assets.
const imageNames: Record<string, string> = {
  ai: "ai", automation: "automation", energy: "energy", longevity: "longevity",
  cybersecurity: "cybersecurity", defense: "defense", fintech: "fintech",
  "premium-consumption": "consumption", "water-food": "food", space: "space",
  "critical-materials": "materials", "digital-education": "education",
  infrastructure: "cities", robotics: "robotics", crypto: "crypto",
};
export function TrendImage({ id, className = "" }: { id: string; className?: string }) {
  const name = imageNames[id];
  return name ? <span aria-hidden="true" className={`${styles.trendImage} ${className}`} style={{ backgroundImage: `url(/images/trends/${name}.jpg)` }} /> : null;
}
