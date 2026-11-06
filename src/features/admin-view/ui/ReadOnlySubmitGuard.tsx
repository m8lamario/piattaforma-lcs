"use client";

import { useEffect } from "react";
import { it } from "@/shared/i18n/it";

export function ReadOnlySubmitGuard() {
  useEffect(() => {
    function block(event: Event) {
      const live = document.getElementById("admin-view-live");
      if (live) live.textContent = it.adminViewBlocked;
      event.preventDefault();
      event.stopPropagation();
      document.querySelector("[data-admin-view-banner]")?.scrollIntoView({ block: "nearest" });
    }

    function allowedForm(form: HTMLFormElement | null) {
      const allow = form?.dataset.viewAllow;
      return allow === "end" || allow === "logout";
    }

    function onSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || allowedForm(form)) return;
      block(event);
    }

    function onClick(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!button) return;
      const form = button.closest("form");
      if (!(form instanceof HTMLFormElement) || allowedForm(form)) return;
      block(event);
    }

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
