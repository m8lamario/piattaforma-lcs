import { preload } from "react-dom";
import {
  HERO_PHOTO_DESKTOP_MEDIA,
  HERO_PHOTO_MOBILE_MEDIA,
  HERO_PHOTOS,
} from "./heroPhotos";

/** Precarica solo la prima coppia art-directed. Le slide successive restano lazy. */
export function HeroPhotoPreload() {
  const first = HERO_PHOTOS[0];
  if (!first) return null;
  preload(first.mobile, {
    as: "image",
    fetchPriority: "high",
    media: HERO_PHOTO_MOBILE_MEDIA,
  });
  preload(first.desktop, {
    as: "image",
    fetchPriority: "high",
    media: HERO_PHOTO_DESKTOP_MEDIA,
  });
  return null;
}
