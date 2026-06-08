import styles from "./VenueBlock.module.css";

interface VenueBlockProps {
  venueName: string;
  address?: string;
}

export default function VenueBlock({ venueName, address }: VenueBlockProps) {
  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>공연장</h2>
      <p className={styles.name}>{venueName}</p>
      {address && <p className={styles.address}>{address}</p>}
    </section>
  );
}
