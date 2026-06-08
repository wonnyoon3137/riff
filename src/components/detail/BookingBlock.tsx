import type { BookingRelate } from "@/domain/types";
import styles from "./BookingBlock.module.css";

interface BookingBlockProps {
  bookings: BookingRelate[];
}

function ExternalIcon() {
  return (
    <svg
      className={styles.externalIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function BookingBlock({ bookings }: BookingBlockProps) {
  if (bookings.length === 0) {
    return (
      <section className={styles.container}>
        <h2 className={styles.heading}>예매하기</h2>
        <p className={styles.noBooking}>예매 정보 없음</p>
      </section>
    );
  }

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>예매하기</h2>
      <div className={styles.buttons}>
        {bookings.map((booking, index) => {
          const label = booking.name
            ? `${booking.name}에서 예매`
            : "예매하기";
          return (
            <a
              key={`${booking.url}-${index}`}
              href={booking.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.bookingButton}
              aria-label={`${label} (새 탭에서 열림)`}
            >
              {label}
              <ExternalIcon />
            </a>
          );
        })}
      </div>
    </section>
  );
}
