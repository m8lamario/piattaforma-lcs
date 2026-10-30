"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSignedDocumentUrlsAction } from "@/features/documents/actions";
import {
  fileCacheEvictionTargets,
  REVIEW_FILE_CACHE_LIMIT,
  reviewPreloadIds,
} from "@/features/documents/domain/reviewPreload";
import { elapsedMs, fileDisplayPhase, recordReviewTiming } from "@/features/documents/domain/reviewTiming";

export type CachedReviewFile =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; objectUrl: string }
  | { status: "error" };

type QueueRef = { id: string }[];

export function useReviewFileCache() {
  const cacheRef = useRef(new Map<string, CachedReviewFile>());
  const objectUrlsRef = useRef(new Map<string, string>());
  const inflightRef = useRef(new Map<string, Promise<void>>());
  const [files, setFiles] = useState<Map<string, CachedReviewFile>>(() => new Map());

  const publish = useCallback(() => {
    setFiles(new Map(cacheRef.current));
  }, []);

  const revoke = useCallback(
    (documentId: string) => {
      const url = objectUrlsRef.current.get(documentId);
      if (url) {
        URL.revokeObjectURL(url);
        objectUrlsRef.current.delete(documentId);
      }
      cacheRef.current.delete(documentId);
      inflightRef.current.delete(documentId);
      publish();
    },
    [publish],
  );

  const trimCache = useCallback(
    (keepIds: readonly string[]) => {
      const cachedIds = [...objectUrlsRef.current.keys()];
      for (const id of fileCacheEvictionTargets(keepIds, cachedIds)) {
        revoke(id);
      }
      while (objectUrlsRef.current.size > REVIEW_FILE_CACHE_LIMIT) {
        const oldest = objectUrlsRef.current.keys().next().value;
        if (!oldest) break;
        if (keepIds.includes(oldest)) break;
        revoke(oldest);
      }
    },
    [revoke],
  );

  const ensurePreloaded = useCallback(
    async (
      queue: QueueRef,
      currentId: string,
      canLoad: (documentId: string) => boolean,
    ) => {
      const targets = reviewPreloadIds(queue, currentId).filter(canLoad);
      trimCache(targets);

      const missing = targets.filter((id) => {
        const entry = cacheRef.current.get(id);
        return !entry || entry.status === "error";
      });
      if (missing.length === 0) return;

      const batchKey = missing.slice().sort().join(",");
      if (inflightRef.current.has(batchKey)) {
        await inflightRef.current.get(batchKey);
        return;
      }

      const work = (async () => {
        for (const id of missing) {
          if (cacheRef.current.get(id)?.status === "ready") continue;
          cacheRef.current.set(id, { status: "loading" });
        }
        publish();

        const signed = await createSignedDocumentUrlsAction(missing);
        if (!("urls" in signed)) {
          for (const id of missing) cacheRef.current.set(id, { status: "error" });
          publish();
          return;
        }

        await Promise.all(
          missing.map(async (documentId) => {
            const signedUrl = signed.urls[documentId];
            if (!signedUrl) {
              cacheRef.current.set(documentId, { status: "error" });
              return;
            }
            const wasCached = objectUrlsRef.current.has(documentId);
            const started = performance.now();
            try {
              const response = await fetch(signedUrl);
              if (!response.ok) throw new Error("fetch_failed");
              const blob = await response.blob();
              const previous = objectUrlsRef.current.get(documentId);
              if (previous) URL.revokeObjectURL(previous);
              const objectUrl = URL.createObjectURL(blob);
              objectUrlsRef.current.set(documentId, objectUrl);
              cacheRef.current.set(documentId, { status: "ready", objectUrl });
              recordReviewTiming({
                phase: fileDisplayPhase(wasCached),
                ms: elapsedMs(started),
                documentId,
              });
            } catch {
              cacheRef.current.set(documentId, { status: "error" });
            }
          }),
        );
        publish();
      })();

      inflightRef.current.set(batchKey, work);
      try {
        await work;
      } finally {
        inflightRef.current.delete(batchKey);
      }
    },
    [publish, trimCache],
  );

  useEffect(() => {
    const urls = objectUrlsRef.current;
    const cache = cacheRef.current;
    return () => {
      for (const id of [...urls.keys()]) {
        const url = urls.get(id);
        if (url) URL.revokeObjectURL(url);
      }
      urls.clear();
      cache.clear();
    };
  }, []);

  const get = useCallback((id: string) => files.get(id) ?? { status: "idle" as const }, [files]);

  return { ensurePreloaded, get, files };
}
