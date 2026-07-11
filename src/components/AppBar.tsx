"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import styles from "./AppBar.module.css";

interface AppBarProps {
  showBack?: boolean;
}

export default function AppBar({ showBack = false }: AppBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 0);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

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

        <div className={styles.authArea}>
          {status === "unauthenticated" && (
            <Link href="/login" className={styles.loginButton}>
              로그인
            </Link>
          )}
          {status === "authenticated" && session?.user && (
            <div className={styles.profileWrapper} ref={dropdownRef}>
              <button
                type="button"
                className={styles.profileButton}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                aria-label={`${session.user.name ?? "프로필"} 메뉴`}
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={24}
                    height={24}
                    className={styles.avatar}
                  />
                ) : (
                  <span className={styles.avatarFallback}>
                    {(session.user.name ?? "?")[0]}
                  </span>
                )}
                <span className={styles.userName}>{session.user.name}</span>
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown} role="menu">
                  <Link
                    href="/following"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    팔로잉 목록
                  </Link>
                  <Link
                    href="/following-feed"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    팔로잉 공연
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
