"use client";

import { use } from "react";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import DetailLayout from "@/components/detail/DetailLayout";
import DetailSkeleton from "@/components/detail/DetailSkeleton";
import PosterBlock from "@/components/detail/PosterBlock";
import InfoBlock from "@/components/detail/InfoBlock";
import BookingBlock from "@/components/detail/BookingBlock";
import VenueBlock from "@/components/detail/VenueBlock";
import { TextSection, ProducerSection } from "@/components/detail/TextInfoBlock";
import CastSection from "@/components/detail/CastSection";
import PriceBandChip from "@/components/PriceBandChip";
import { parsePriceBand } from "@/domain/price-band";
import GalleryBlock from "@/components/detail/GalleryBlock";
import ErrorState from "@/components/ErrorState";
import { usePerformanceDetail } from "@/hooks/usePerformanceDetail";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ mt20id: string }>;
}

export default function PerformanceDetailPage({ params }: PageProps) {
  const { mt20id } = use(params);
  const { data: performance, isLoading, isError, refetch } =
    usePerformanceDetail(mt20id);

  return (
    <>
      <AppBar showBack />

      {isLoading && <DetailSkeleton />}

      {isError && (
        <div className={styles.errorContainer}>
          <ErrorState onRetry={() => refetch()} />
          <Link href="/" className={styles.backToListLink}>
            목록으로
          </Link>
        </div>
      )}

      {performance && (
        <DetailLayout
          left={
            <PosterBlock
              posterUrl={performance.posterUrl}
              title={performance.title}
            />
          }
          right={
            <>
              <InfoBlock performance={performance} />
              <BookingBlock bookings={performance.bookings} />
              <VenueBlock
                venueName={performance.venueName}
                address={performance.venueAddress}
              />
              {performance.cast && (
                <CastSection
                  cast={performance.cast}
                  matchedArtists={performance.matchedArtists}
                />
              )}
              {performance.story && (
                <TextSection title="줄거리" content={performance.story} />
              )}
              {performance.priceGuidance && (
                <TextSection
                  title="가격"
                  content={performance.priceGuidance}
                  chip={(() => {
                    const { band, label } = parsePriceBand(
                      performance.priceGuidance,
                    );
                    return <PriceBandChip band={band} label={label} />;
                  })()}
                />
              )}
              {performance.producers && (
                <ProducerSection producers={performance.producers} />
              )}
              <GalleryBlock
                images={performance.introImages}
                title={performance.title}
              />
            </>
          }
        />
      )}
    </>
  );
}
