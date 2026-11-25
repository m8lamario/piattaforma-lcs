"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import {
  HERO_PHOTO_DESKTOP_MEDIA,
  HERO_PHOTO_INTERVAL_MS,
  HERO_PHOTOS,
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

export function HeroPhotoStage({ styles }: Props) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const canRotate = !reduceMotion && HERO_PHOTOS.length > 1;

  useEffect(() => {
    if (!canRotate) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_PHOTOS.length);
    }, HERO_PHOTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [canRotate]);

  const slide = HERO_PHOTOS[index] ?? HERO_PHOTOS[0];
  const isLcp = index === 0;

  return (
    <div className={styles.stage} data-graphic-slot="" aria-hidden="true">
      <div className={styles.stageBack} />
      <div className={styles.stagePhoto}>
        <AnimatePresence initial={false}>
          <motion.div
            key={`${slide.desktop}:${slide.mobile}`}
            className={styles.stageSlide}
            initial={isLcp || reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <picture>
              <source media={HERO_PHOTO_DESKTOP_MEDIA} srcSet={slide.desktop} />
              <img
                className={styles.stageImage}
                src={slide.mobile}
                alt=""
                width={slide.mobileWidth}
                height={slide.mobileHeight}
                fetchPriority={isLcp ? "high" : "low"}
                loading={isLcp ? "eager" : "lazy"}
                decoding={isLcp ? "auto" : "async"}
                style={
                  {
                    "--photo-pos-desktop": slide.objectPositionDesktop,
                    "--photo-pos-mobile": slide.objectPositionMobile,
                  } as CSSProperties
                }
              />
            </picture>
          </motion.div>
        </AnimatePresence>
      </div>
      <span className={styles.stageRail} />
    </div>
  );
}
