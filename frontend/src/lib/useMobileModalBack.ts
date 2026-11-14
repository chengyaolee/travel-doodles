"use client";

import { useEffect, useEffectEvent } from "react";

const historyKey = "travelDoodlesModal";
const openModals = new Set<() => void>();
let modalEntry: string | null = null;
let entryNumber = 0;
let waitingForBack = false;
let reconciliationQueued = false;

function reconcileHistory() {
  if (reconciliationQueued) return;
  reconciliationQueued = true;

  // A dialog can close and open another in the same render.
  queueMicrotask(() => {
    reconciliationQueued = false;
    if (waitingForBack) return;

    const currentEntry = window.history.state?.[historyKey];
    if (openModals.size > 0) {
      if (currentEntry && currentEntry === modalEntry) return;
      modalEntry = Date.now().toString(36) + "-" + ++entryNumber;
      window.addEventListener("popstate", handlePopState);
      window.history.pushState({ [historyKey]: modalEntry }, "", window.location.href);
    } else if (modalEntry && currentEntry === modalEntry) {
      waitingForBack = true;
      window.history.back();
    } else {
      modalEntry = null;
      window.removeEventListener("popstate", handlePopState);
    }
  });
}

function handlePopState(event: PopStateEvent) {
  if (!modalEntry || event.state?.[historyKey] === modalEntry) return;
  modalEntry = null;

  if (waitingForBack) {
    waitingForBack = false;
  } else {
    const close = Array.from(openModals).at(-1);
    if (close) {
      openModals.delete(close);
      close();
    }
  }

  reconcileHistory();
}

export function useMobileModalBack(isOpen: boolean, onClose: () => void) {
  const closeModal = useEffectEvent(onClose);

  useEffect(() => {
    if (!isOpen || !window.matchMedia("(max-width: 767px)").matches) return;

    const close = () => closeModal();
    openModals.add(close);
    reconcileHistory();

    return () => {
      openModals.delete(close);
      reconcileHistory();
    };
  }, [isOpen]);
}
