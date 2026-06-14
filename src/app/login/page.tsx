"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <main className={styles.bg}>
      <div className={styles.card}>
        <p className={styles.logo}>Riff</p>
        <h1 className={styles.title}>로그인</h1>

        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.kakaoButton}
            aria-label="카카오 계정으로 로그인"
            onClick={() => signIn("kakao", { callbackUrl: "/" })}
          >
            <KakaoIcon />
            카카오로 시작하기
          </button>

          <button
            type="button"
            className={styles.googleButton}
            aria-label="구글 계정으로 로그인"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <GoogleIcon />
            구글로 시작하기
          </button>
        </div>

        <p className={styles.terms}>
          로그인 시{" "}
          <a href="/terms" className={styles.termsLink}>
            이용약관
          </a>{" "}
          및{" "}
          <a href="/privacy" className={styles.termsLink}>
            개인정보처리방침
          </a>
          에 동의합니다.
        </p>
      </div>
    </main>
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
      <path d="M10 2C5.58 2 2 4.91 2 8.5c0 2.32 1.56 4.36 3.9 5.5L5 17l4.2-2.8c.26.03.53.05.8.05 4.42 0 8-2.91 8-6.5S14.42 2 10 2z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M18.17 9.09H10v2.73h4.72c-.46 2.36-2.5 3.77-4.72 3.77a5.45 5.45 0 0 1 0-10.9c1.37 0 2.6.51 3.55 1.34l2.06-2.06A8.18 8.18 0 1 0 10 18.18c4.54 0 8.18-3.27 8.18-8.18 0-.34-.03-.68-.01-.91z"
        fill="var(--brand-google-blue)"
      />
      <path
        d="M2.64 6.1l2.37 1.74A5.45 5.45 0 0 1 10 4.59c1.37 0 2.6.51 3.55 1.34l2.06-2.06A8.18 8.18 0 0 0 2.64 6.1z"
        fill="var(--brand-google-green)"
      />
      <path
        d="M10 18.18c2.16 0 4.12-.71 5.64-1.92l-2.6-2.14A5.45 5.45 0 0 1 4.63 11H2.18a8.18 8.18 0 0 0 7.82 7.18z"
        fill="var(--brand-google-yellow)"
      />
      <path
        d="M18.17 9.09H10v2.73h4.72a5.46 5.46 0 0 1-2.08 2.39l2.6 2.14c1.52-1.41 2.76-3.5 2.76-6.35 0-.34-.03-.68-.03-.91z"
        fill="var(--brand-google-red)"
      />
    </svg>
  );
}
