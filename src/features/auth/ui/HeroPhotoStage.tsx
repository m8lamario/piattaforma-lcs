"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  HERO_PHOTO_DESKTOP_MEDIA,
  HERO_PHOTO_INTERVAL_MS,
  HERO_PHOTOS,
  type HeroPhotoSlide,
} from "./heroPhotos";

export type HeroPhotoStageStyles = {
  stage: string;
  stageBack: string;
  stagePhoto: string;
  stageSlide: string;
  stageImage: string;
  stageRail: string;
};

type Props = {
  styles: HeroPhotoStageStyles;
};

function Slide({
  slide,
  styles,
  active,
  lcp,
}: {
  slide: HeroPhotoSlide;
  styles: HeroPhotoStageStyles;
  active: boolean;
  lcp: boolean;
}) {
  return (
    <div className={styles.stageSlide} data-active={active ? "" : undefined} data-lcp={lcp ? "" : undefined}>
      <picture>
        <source media={HERO_PHOTO_DESKTOP_MEDIA} srcSet={slide.desktop} />
        <img
          className={styles.stageImage}
          src={slide.mobile}
          alt=""
          width={slide.mobileWidth}
          height={slide.mobileHeight}
          fetchPriority={lcp ? "high" : "low"}
          loading={lcp ? "eager" : "lazy"}
          decoding={lcp ? "auto" : "async"}
          style={
            {
              "--photo-pos-desktop": slide.objectPositionDesktop,
              "--photo-pos-mobile": slide.objectPositionMobile,
            } as CSSProperties
          }
        />
      </picture>
    </div>
  );
}

export function HeroPhotoStage({ styles }: Props) {
  const [{ index, outgoingIndex }, setSlide] = useState<{ index: number; outgoingIndex: number | null }>({
    index: 0,
    outgoingIndex: null,
  });
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || HERO_PHOTOS.length < 2) return;
    const id = window.setInterval(() => {
      setSlide((current) => ({
        index: (current.index + 1) % HERO_PHOTOS.length,
        outgoingIndex: current.index,
      }));
    }, HERO_PHOTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const current = HERO_PHOTOS[index] ?? HERO_PHOTOS[0];
  const outgoing =
    outgoingIndex !== null && outgoingIndex !== index ? (HERO_PHOTOS[outgoingIndex] ?? null) : null;

  if (!current) return null;

  return (
    <div className={styles.stage} data-graphic-slot="" aria-hidden="true">
      <div className={styles.stageBack} />
      <div className={styles.stagePhoto}>
        {outgoing ? <Slide slide={outgoing} styles={styles} active={false} lcp={false} /> : null}
        <Slide slide={current} styles={styles} active lcp={index === 0} />
      </div>
      <span className={styles.stageRail} />
    </div>
  );
}
