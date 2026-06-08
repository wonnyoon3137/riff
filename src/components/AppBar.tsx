"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./AppBar.module.css";

interface AppBarProps {
  showBack?: boolean;
}

export default function AppBar({ showBack = false }: AppBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 0);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const className = [
    styles.appBar,
    scrolled ? styles.appBarScrolled : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={className} role="banner">
      <div className={styles.inner}>
        {showBack && (
          <button
            className={styles.backButton}
            onClick={() => router.back()}
            aria-label="뒤로 가기"
            type="button"
          >
            <svg
              className={styles.backIcon}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        <Link href="/" className={styles.brandLink}>
          <Image
            className={styles.brandLogo}
            src="/illustrations/brand-mark.svg"
            alt=""
            width={32}
            height={32}
            priority
          />
          <span className={styles.brandName}>Riff</span>
        </Link>
      </div>
    </header>
  );
}
