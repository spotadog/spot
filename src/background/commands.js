export const RESUME_COMMAND = 'resume-auto-scroll';

// Chrome delivers this event even while the popup/sidebar is closed.
export function resumeCommand(api, navigate) {
  return async (command, commandTab) => {
    if (command !== RESUME_COMMAND) return;
    try {
      const tab = commandTab ?? (await api.tabs.query({ active: true, lastFocusedWindow: true }))[0];
      if (!Number.isInteger(tab?.id)) return;
      await navigate({ type: 'scroll.resume', tabId: tab.id }, { id: api.runtime.id, url: api.runtime.getURL('background/worker.js') });
    } catch { /* Closed/restricted/unavailable tabs cannot be resumed. */ }
  };
}
