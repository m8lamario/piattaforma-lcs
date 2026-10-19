"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { loadMediaPlayerCardAction, searchMediaPlayersAction } from "@/features/media-partners/actions";
import type { MediaPlayerCard, MediaSearchHit } from "@/features/media-partners/domain/verify";
import { MEDIA_SEARCH_MIN_LENGTH } from "@/features/media-partners/domain/verify";
import type { ErrorCode } from "@/shared/errors";
import { ActionError } from "@/shared/ui/ActionError";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Skeleton } from "@/shared/ui/Skeleton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./media.module.css";
import {
  mediaAgeLabel,
  mediaHeadlineClass,
  mediaReasonLabel,
  mediaStateLabel,
  mediaStateTone,
  mediaUseLabel,
} from "./status";

type Props = {
  organizationName?: string | null;
};

function hasHomonyms(results: MediaSearchHit[]) {
  const names = new Map<string, number>();
  for (const row of results) {
    const key = `${row.firstName} ${row.lastName}`.toLowerCase();
    names.set(key, (names.get(key) ?? 0) + 1);
  }
  return [...names.values()].some((count) => count > 1);
}

function PlayerCard({ card, loading }: { card: MediaPlayerCard | null; loading: boolean }) {
  if (loading && !card) {
    return (
      <section className={styles.card} aria-busy="true">
        <p className={styles.status} role="status">
          {it.mediaCardLoading}
        </p>
        <Skeleton variant="title" width="12rem" />
        <Skeleton width="80%" />
        <Skeleton variant="block" height="4rem" />
        <Skeleton variant="block" height="4rem" />
      </section>
    );
  }
  if (!card) return null;

  const photoClass = styles[mediaHeadlineClass(card.photoVideo.state)];
  const socialClass = styles[mediaHeadlineClass(card.social.state)];
  const showWarning = card.unverifiable || card.photoVideo.state === "unverifiable" || card.social.state === "unverifiable";

  return (
    <section className={styles.card} aria-live="polite">
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>
          {card.firstName} {card.lastName}
        </h2>
        <p className={styles.resultMeta}>
          {card.teamName} · {card.competitionName} · {card.editionName}
        </p>
        <div className={styles.chips}>
          <StatusChip tone="neutral">
            {card.category === "STAFF" ? it.mediaCategoryStaff : it.mediaCategoryPlayer}
          </StatusChip>
          <StatusChip tone={card.ageBand === "unverifiable" ? "attention" : "neutral"}>
            {mediaAgeLabel(card.ageBand)}
          </StatusChip>
        </div>
      </header>

      {showWarning ? <p className={styles.warning}>{it.mediaWarningUnverifiable}</p> : null}

      <div className={styles.headlines}>
        <div className={`${styles.headline} ${photoClass}`}>
          <p className={styles.headlineLabel}>{it.mediaPhotoVideo}</p>
          <StatusChip tone={mediaStateTone(card.photoVideo.state)}>
            {mediaStateLabel(card.photoVideo.state)}
          </StatusChip>
          {mediaReasonLabel(card.photoVideo.reason) ? (
            <p className={styles.reason}>{mediaReasonLabel(card.photoVideo.reason)}</p>
          ) : null}
        </div>
        <div className={`${styles.headline} ${socialClass}`}>
          <p className={styles.headlineLabel}>{it.mediaSocial}</p>
          <StatusChip tone={mediaStateTone(card.social.state)}>{mediaStateLabel(card.social.state)}</StatusChip>
          <p className={styles.headlineHelp}>{it.mediaSocialHelp}</p>
          {mediaReasonLabel(card.social.reason) ? (
            <p className={styles.reason}>{mediaReasonLabel(card.social.reason)}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.uses}>
        <h3 className={styles.headlineLabel}>{it.mediaUsesTitle}</h3>
        {card.uses.map((use) => (
          <div key={use.key} className={styles.useRow}>
            <span className={styles.useLabel}>{mediaUseLabel(use.key)}</span>
            <div className={styles.chips}>
              <StatusChip tone={mediaStateTone(use.state)}>{mediaStateLabel(use.state)}</StatusChip>
            </div>
            {mediaReasonLabel(use.reason) ? <p className={styles.reason}>{mediaReasonLabel(use.reason)}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function MediaDashboard({ organizationName }: Props) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSearchHit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [card, setCard] = useState<MediaPlayerCard | null>(null);
  const [searchError, setSearchError] = useState<{ error?: string; code?: ErrorCode } | null>(null);
  const [cardError, setCardError] = useState<{ error?: string; code?: ErrorCode } | null>(null);
  const [searching, startSearch] = useTransition();
  const [loadingCard, startCard] = useTransition();
  const requestRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MEDIA_SEARCH_MIN_LENGTH) return;
    const handle = window.setTimeout(() => {
      const requestId = ++requestRef.current;
      startSearch(async () => {
        const formData = new FormData();
        formData.set("query", trimmed);
        const state = await searchMediaPlayersAction(undefined, formData);
        if (requestId !== requestRef.current) return;
        if (state.error) {
          setSearchError({ error: state.error, code: state.code });
          setResults([]);
          return;
        }
        setSearchError(null);
        setResults(state.results ?? []);
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  function openCard(registrationId: string) {
    setSelectedId(registrationId);
    setCardError(null);
    startCard(async () => {
      const formData = new FormData();
      formData.set("registrationId", registrationId);
      const state = await loadMediaPlayerCardAction(undefined, formData);
      if (state.error) {
        setCardError({ error: state.error, code: state.code });
        setCard(null);
        return;
      }
      setCard(state.card ?? null);
    });
  }

  const idle = query.trim().length < MEDIA_SEARCH_MIN_LENGTH;
  const visibleResults = idle ? [] : results;
  const homonyms = hasHomonyms(visibleResults);

  return (
    <div className={styles.dashboard}>
      <PageHeader
        kicker={organizationName ?? it.navMedia}
        title={it.mediaDashboardTitle}
        description={it.mediaDashboardLead}
      />

      <form className={styles.search} onSubmit={(event) => event.preventDefault()}>
        <div className={fields.field}>
          <label className={fields.label} htmlFor={inputId}>
            {it.mediaSearchLabel}
          </label>
          <input
            id={inputId}
            className={`${fields.input} ${styles.searchInput}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={it.mediaSearchPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={`${inputId}-hint`}
            aria-controls={listId}
          />
          <p id={`${inputId}-hint`} className={styles.hint}>
            {it.mediaSearchHint}
          </p>
        </div>
        {!idle && searchError?.error ? <ActionError error={searchError.error} code={searchError.code} /> : null}
      </form>

      <div className={styles.layout}>
        <div>
          {idle ? <p className={styles.status}>{it.mediaSearchIdle}</p> : null}
          {searching ? (
            <p className={styles.status} role="status">
              {it.mediaSearchLoading}
            </p>
          ) : null}
          {!idle && !searching && visibleResults.length === 0 && !searchError ? (
            <p className={styles.status}>{it.mediaSearchEmpty}</p>
          ) : null}
          {homonyms ? <p className={styles.hint}>{it.mediaHomonymHint}</p> : null}
          {visibleResults.length > 0 ? (
            <ul id={listId} className={styles.results} role="listbox" aria-label={it.mediaSearchLabel}>
              {visibleResults.map((row) => (
                <li key={row.registrationId}>
                  <button
                    type="button"
                    className={styles.result}
                    aria-current={selectedId === row.registrationId}
                    onClick={() => openCard(row.registrationId)}
                  >
                    <span className={styles.resultName}>
                      {row.firstName} {row.lastName}
                    </span>
                    <span className={styles.resultMeta}>
                      {row.teamName} · {row.competitionName} · {row.editionName} ·{" "}
                      {row.category === "STAFF" ? it.mediaCategoryStaff : it.mediaCategoryPlayer}
                    </span>
                    <span className={styles.chips}>
                      <StatusChip tone={mediaStateTone(row.photoVideo.state)}>
                        {it.mediaPhotoVideo}: {mediaStateLabel(row.photoVideo.state)}
                      </StatusChip>
                      <StatusChip tone={mediaStateTone(row.social.state)}>
                        {it.mediaSocial}: {mediaStateLabel(row.social.state)}
                      </StatusChip>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          {cardError?.error ? <ActionError error={cardError.error} code={cardError.code} /> : null}
          <PlayerCard card={card} loading={loadingCard} />
        </div>
      </div>
    </div>
  );
}
