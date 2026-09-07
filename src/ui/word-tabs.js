// Switching panels preserves both keyword editors and their unsaved drafts.
export function wordTabs(container) {
  const tabs = [...container.querySelectorAll('[role=tab]')];
  function select(id) {
    for (const tab of tabs) {
      const active = tab.id === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.id));
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next].id);
      tabs[next].focus();
    });
  });
  return { select };
}
