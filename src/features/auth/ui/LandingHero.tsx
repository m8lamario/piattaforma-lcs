"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { it } from "@/shared/i18n/it";
import styles from "./LandingHero.module.css";

export function LandingHero() {
  return (
    <motion.section
      className={styles.hero}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <p className={styles.badge}>Solo su invito</p>
      <h1>{it.appName}</h1>
      <p className={styles.lead}>{it.tagline}</p>
      <p className={styles.copy}>{it.landingLead}</p>
      <div className={styles.actions}>
        <Link className={styles.primary} href="/accedi">
          {it.ctaLogin}
        </Link>
        <Link className={styles.ghost} href="/invito">
          {it.ctaInvite}
        </Link>
      </div>
    </motion.section>
  );
}
