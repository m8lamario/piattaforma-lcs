export type HeroPhotoSlide = {
  desktop: string;
  mobile: string;
  objectPositionDesktop: string;
  objectPositionMobile: string;
};

type HeroPhoto = {
  src: string;
  objectPosition: string;
};

/** Orizzontali: solo desktop (`min-width: 960px`). Il telefono non le scarica. */
const HERO_PHOTOS_DESKTOP: HeroPhoto[] = [
  { src: "/img/horizontal.webp", objectPosition: "46% 40%" },
  { src: "/img/horizontal-02.webp", objectPosition: "50% 42%" },
];

/** Verticali: solo mobile. */
const HERO_PHOTOS_MOBILE: HeroPhoto[] = [
  { src: "/img/vertical.webp", objectPosition: "50% 40%" },
  { src: "/img/vertical-02.webp", objectPosition: "50% 64%" },
  { src: "/img/vertical-03.webp", objectPosition: "50% 58%" },
  { src: "/img/vertical-04.webp", objectPosition: "50% 36%" },
  { src: "/img/vertical-05.jpeg", objectPosition: "50% 42%" },
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function zipHeroPhotos(desktop: HeroPhoto[], mobile: HeroPhoto[]): HeroPhotoSlide[] {
  if (desktop.length === 0 || mobile.length === 0) return [];
  const count = (desktop.length * mobile.length) / gcd(desktop.length, mobile.length);
  return Array.from({ length: count }, (_, index) => {
    const wide = desktop[index % desktop.length]!;
    const tall = mobile[index % mobile.length]!;
    return {
      desktop: wide.src,
      mobile: tall.src,
      objectPositionDesktop: wide.objectPosition,
      objectPositionMobile: tall.objectPosition,
    };
  });
}

/** Una sola slide: niente rotazione. Liste di lunghezza diversa: il viewport più corto ripete in modo uniforme. */
export const HERO_PHOTOS: HeroPhotoSlide[] = zipHeroPhotos(HERO_PHOTOS_DESKTOP, HERO_PHOTOS_MOBILE);

export const HERO_PHOTO_INTERVAL_MS = 4000;
