import type { CSSProperties, ReactNode } from "react";
import { it } from "@/shared/i18n/it";
import { DelayedSkeleton } from "./DelayedSkeleton";
import styles from "./Skeleton.module.css";

type BoneVariant = "text" | "title" | "block" | "circle" | "chip" | "button" | "input";

type SkeletonProps = {
  variant?: BoneVariant;
  width?: string;
  height?: string;
  className?: string;
};

const VARIANT_CLASS: Record<BoneVariant, string> = {
  text: styles.text,
  title: styles.title,
  block: styles.block,
  circle: styles.circle,
  chip: styles.chip,
  button: styles.button,
  input: styles.input,
};

export function Skeleton({ variant = "text", width, height, className }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;
  const classes = [styles.bone, VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return <span className={classes} style={style} aria-hidden="true" />;
}

type RegionProps = {
  label: string;
  className?: string;
  children: ReactNode;
};

function Region({ label, className, children }: RegionProps) {
  return (
    <div className={[styles.region, className].filter(Boolean).join(" ")} aria-busy="true">
      <p className={styles.visuallyHidden} role="status">
        {label}
      </p>
      {children}
    </div>
  );
}

function HeaderBones({ kicker = true }: { kicker?: boolean }) {
  return (
    <div className={styles.header}>
      {kicker ? <Skeleton width="12rem" /> : null}
      <Skeleton variant="title" width="16rem" />
      <Skeleton width="min(28rem, 80%)" />
    </div>
  );
}

function PanelBones({ rows = 3, avatar = false }: { rows?: number; avatar?: boolean }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Skeleton variant="block" className={styles.cardIcon} />
        <Skeleton width="9rem" height="var(--text-md)" />
      </div>
      <ul className={styles.cardRows}>
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className={styles.cardRow}>
            {avatar ? <Skeleton variant="circle" className={styles.avatar} /> : null}
            <span className={styles.stack} style={{ gap: "var(--space-1)", flex: 1 }}>
              <Skeleton width="10rem" />
              <Skeleton width="7rem" />
            </span>
            <Skeleton variant="chip" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroBones() {
  return (
    <div className={styles.heroCard}>
      <div className={styles.stack}>
        <Skeleton width="8rem" />
        <Skeleton variant="title" width="80%" />
        <Skeleton width="65%" />
        <Skeleton variant="button" />
      </div>
      <div className={styles.heroAside}>
        <Skeleton width="7rem" />
        <Skeleton variant="block" className={styles.progressTrack} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <DelayedSkeleton>
      <Region label={it.skeletonDashboardLabel} className={styles.dashboard}>
        <HeaderBones />
        <HeroBones />
        <div className={styles.dashboardLayout}>
          <PanelBones rows={4} />
          <PanelBones rows={2} />
        </div>
      </Region>
    </DelayedSkeleton>
  );
}

export function WizardSkeleton() {
  return (
    <DelayedSkeleton>
      <Region label={it.skeletonWizardLabel} className={styles.wizard}>
        <div className={styles.row} style={{ justifyContent: "space-between" }}>
          <Skeleton width="9rem" />
          <Skeleton width="10rem" />
        </div>
        <div className={styles.steps}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="circle" className={styles.stepMark} />
          ))}
        </div>
        <div className={styles.card} style={{ padding: "var(--space-6)" }}>
          <div className={styles.stack} style={{ gap: "var(--space-2)" }}>
            <Skeleton width="8rem" />
            <Skeleton variant="title" width="12rem" />
            <Skeleton width="70%" />
          </div>
          <div className={styles.group}>
            <Skeleton width="5rem" />
            <Skeleton variant="input" />
            <Skeleton width="5rem" />
            <Skeleton variant="input" />
          </div>
          <div className={styles.actions}>
            <Skeleton variant="button" />
            <Skeleton variant="button" />
          </div>
        </div>
      </Region>
    </DelayedSkeleton>
  );
}

export function TeamSkeleton() {
  return (
    <DelayedSkeleton>
      <Region label={it.skeletonTeamLabel} className={styles.team}>
        <HeaderBones kicker={false} />
        <div className={styles.chips}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} variant="chip" />
          ))}
        </div>
        <div className={styles.teamLayout}>
          <PanelBones rows={5} avatar />
          <PanelBones rows={1} />
        </div>
      </Region>
    </DelayedSkeleton>
  );
}

export function CommunicationsSkeleton() {
  return (
    <DelayedSkeleton>
      <Region label={it.skeletonCommunicationsLabel} className={styles.communications}>
        <HeaderBones kicker={false} />
        <PanelBones rows={3} avatar />
      </Region>
    </DelayedSkeleton>
  );
}

export function AdminDocumentsSkeleton() {
  return (
    <DelayedSkeleton>
    <Region label={it.skeletonDocumentsLabel} className={styles.admin}>
      <div className={styles.adminHero}>
        <Skeleton variant="title" width="16rem" />
        <Skeleton width="100%" />
        <Skeleton width="70%" />
      </div>
      <div className={styles.adminList}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={styles.adminItem}>
            <Skeleton width="12rem" />
            <Skeleton width="14rem" />
          </div>
        ))}
      </div>
      <div className={styles.stack}>
        <Skeleton variant="title" width="10rem" height="var(--text-md)" />
        <div className={styles.adminList}>
          {Array.from({ length: 2 }, (_, index) => (
            <div key={`recent-${index}`} className={styles.adminItem}>
              <Skeleton width="12rem" />
              <Skeleton width="14rem" />
            </div>
          ))}
        </div>
      </div>
    </Region>
    </DelayedSkeleton>
  );
}

export function AdminDocumentDetailSkeleton() {
  return (
    <DelayedSkeleton>
    <Region label={it.skeletonDocumentLabel} className={styles.admin}>
      <Skeleton width="10rem" />
      <div className={styles.adminDetail}>
        <Skeleton variant="title" width="16rem" />
        <Skeleton width="18rem" />
        <Skeleton width="14rem" />
        <Skeleton width="20rem" />
        <div className={styles.row}>
          <Skeleton variant="button" />
          <Skeleton variant="button" />
        </div>
      </div>
    </Region>
    </DelayedSkeleton>
  );
}

export function AuthCardSkeleton() {
  return (
    <DelayedSkeleton>
    <Region label={it.skeletonAuthLabel} className={styles.auth}>
      <div className={styles.authSheet}>
        <Skeleton width="7rem" />
        <Skeleton variant="title" width="80%" />
        <Skeleton width="100%" />
        <Skeleton width="5rem" />
        <Skeleton variant="input" />
        <Skeleton width="6rem" />
        <Skeleton variant="input" />
        <Skeleton variant="button" />
      </div>
    </Region>
    </DelayedSkeleton>
  );
}

export function LegalArticleSkeleton() {
  return (
    <DelayedSkeleton>
    <Region label={it.skeletonLegalLabel} className={styles.legal}>
      <div className={styles.legalCard}>
        <Skeleton variant="title" width="12rem" />
        <Skeleton variant="block" className={styles.notice} />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} width={index % 3 === 0 ? "92%" : "100%"} />
        ))}
        <Skeleton variant="button" width="8rem" />
      </div>
    </Region>
    </DelayedSkeleton>
  );
}

export function PaymentResultSkeleton() {
  return (
    <DelayedSkeleton>
    <Region label={it.loadingPaymentConfirm} className={styles.payment}>
      <p className={styles.progressLabel}>{it.loadingPaymentConfirm}</p>
      <p className={styles.progressLabel}>{it.loadingPaymentConfirmLead}</p>
      <Skeleton variant="block" className={styles.progressTrack} />
    </Region>
    </DelayedSkeleton>
  );
}

type IndeterminateProgressProps = {
  label: string;
};

export function IndeterminateProgress({ label }: IndeterminateProgressProps) {
  return (
    <div className={styles.progress} role="status" aria-live="polite">
      <Skeleton variant="block" className={styles.progressTrack} />
      <p className={styles.progressLabel}>{label}</p>
    </div>
  );
}
