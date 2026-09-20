import type { CSSProperties, ReactNode } from "react";
import { it } from "@/shared/i18n/it";
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

export function DashboardSkeleton() {
  return (
    <Region label={it.skeletonDashboardLabel} className={styles.dashboard}>
      <div className={styles.dashboardHead}>
        <Skeleton width="14rem" />
        <Skeleton variant="chip" />
      </div>
      <Skeleton variant="title" width="12rem" />

      <div className={styles.dashboardLayout}>
        <div className={styles.dashboardMain}>
          <div className={styles.dashboardHero}>
            <Skeleton variant="title" width="80%" />
            <Skeleton width="70%" />
            <Skeleton variant="button" />
          </div>
          <div className={styles.stack} style={{ marginTop: "var(--space-4)" }}>
            <Skeleton variant="title" width="8rem" height="var(--text-md)" />
            <ul className={styles.checklist}>
              {Array.from({ length: 5 }, (_, index) => (
                <li key={index} className={styles.checklistItem}>
                  <span className={styles.stack} style={{ gap: "var(--space-1)", flex: 1 }}>
                    <Skeleton width="10rem" />
                    <Skeleton width="8rem" />
                  </span>
                  <Skeleton variant="chip" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.dashboardSide}>
          <Skeleton variant="title" width="9rem" height="var(--text-md)" />
          <div className={styles.progressBlock}>
            <Skeleton width="11rem" />
            <div className={styles.segments}>
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} variant="block" className={styles.segment} />
              ))}
            </div>
          </div>
          <Skeleton width="100%" height="3rem" variant="block" />
          <Skeleton width="100%" height="2rem" variant="block" />
        </div>
      </div>
    </Region>
  );
}

export function WizardSkeleton() {
  return (
    <Region label={it.skeletonWizardLabel} className={styles.wizard}>
      <div className={styles.wizardLayout}>
        <div className={styles.stack} style={{ gap: "var(--space-5)" }}>
          <Skeleton width="8rem" />
          <header className={styles.heading} style={{ margin: 0 }}>
            <Skeleton variant="circle" />
            <span className={styles.stack} style={{ flex: 1, gap: "var(--space-2)" }}>
              <Skeleton variant="title" width="12rem" />
              <Skeleton width="70%" />
            </span>
          </header>
          <div className={styles.group}>
            <Skeleton width="5rem" />
            <Skeleton width="4rem" />
            <Skeleton variant="input" />
            <Skeleton width="5rem" />
            <Skeleton variant="input" />
          </div>
          <div className={styles.group}>
            <Skeleton width="8rem" />
            <Skeleton width="5rem" />
            <Skeleton variant="input" />
          </div>
          <div className={styles.actions}>
            <Skeleton variant="button" />
            <Skeleton variant="button" />
          </div>
        </div>

        <div className={styles.dashboardSide}>
          <Skeleton variant="title" width="10rem" height="var(--text-md)" />
          <ol className={styles.checklist}>
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className={styles.checklistItem}>
                <Skeleton width="7rem" />
                <Skeleton variant="circle" />
              </li>
            ))}
          </ol>
          <Skeleton width="100%" height="4rem" variant="block" />
        </div>
      </div>
    </Region>
  );
}

export function TeamSkeleton() {
  return (
    <Region label={it.skeletonTeamLabel} className={styles.team}>
      <div className={styles.hero}>
        <Skeleton width="16rem" />
        <Skeleton variant="title" width="18rem" />
        <Skeleton width="14rem" />
      </div>

      <div className={styles.teamLayout}>
        <div className={styles.teamMain}>
          <div className={styles.stack}>
            <Skeleton variant="title" width="6rem" height="var(--text-md)" />
            <Skeleton width="22rem" />
            <div className={styles.teamRows}>
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className={styles.teamRow}>
                  <Skeleton width="12rem" />
                  <div className={styles.chips}>
                    <Skeleton variant="chip" />
                    <Skeleton variant="chip" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.teamSide}>
          <Skeleton variant="title" width="10rem" height="var(--text-md)" />
          <Skeleton width="100%" height="3rem" variant="block" />
          <Skeleton variant="button" />
        </div>
      </div>
    </Region>
  );
}

export function CommunicationsSkeleton() {
  return (
    <Region label={it.skeletonCommunicationsLabel} className={styles.communications}>
      <Skeleton variant="title" width="12rem" />
      <div className={styles.messageList}>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={styles.messageItem}>
            <Skeleton width="16rem" />
            <Skeleton width="100%" />
            <Skeleton width="80%" />
          </div>
        ))}
      </div>
    </Region>
  );
}

export function AdminDocumentsSkeleton() {
  return (
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
  );
}

export function AdminDocumentDetailSkeleton() {
  return (
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
  );
}

export function AuthCardSkeleton() {
  return (
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
  );
}

export function LegalArticleSkeleton() {
  return (
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
  );
}

export function PaymentResultSkeleton() {
  return (
    <Region label={it.loadingPaymentConfirm} className={styles.payment}>
      <p className={styles.progressLabel}>{it.loadingPaymentConfirm}</p>
      <p className={styles.progressLabel}>{it.loadingPaymentConfirmLead}</p>
      <Skeleton variant="block" className={styles.progressTrack} />
    </Region>
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
