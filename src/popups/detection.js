const semantic = 'dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"], [popover]';
const candidates = `${semantic}, [class*="modal"], [class*="popup"], [class*="overlay"]`;
export function visiblePopups(doc) {
  const win = doc.defaultView;
  const nodes = [...doc.querySelectorAll(candidates)].filter(node => {
    if (!node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || node.closest('[hidden], [aria-hidden="true"]')) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 30 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= win.innerHeight || rect.left >= win.innerWidth) return false;
    if (node.matches('dialog') && !node.open) return false;
    if (node.hasAttribute('popover') && !node.matches(':popover-open')) return false;
    if (node.matches(semantic)) return true;
    const style = win.getComputedStyle(node);
    return ['fixed', 'absolute'].includes(style.position) && Number(style.zIndex) > 0;
  });
  // Prefer the semantic dialog inside a backdrop and avoid counting wrappers twice.
  return nodes.filter(node => !nodes.some(other => other !== node &&
    (node.contains(other) && other.matches(semantic) || other.contains(node) && !node.matches(semantic))));
}
export function popupIdentity(node, pageURL, trigger) {
  const item = node.getAttribute('data-item-id') || node.getAttribute('data-popup-id') || node.querySelector('[data-item-id]')?.getAttribute('data-item-id');
  if (item) return { identity: `${new URL(pageURL).origin}|item:${item}`, label: `${pageURL} — item ${item}` };
  if (trigger?.url) return { identity: trigger.url, label: trigger.url };
  const id = node.id || node.getAttribute('aria-label') || node.querySelector('h1,h2,h3,[role="heading"]')?.textContent?.trim();
  if (id) return { identity: `${pageURL}|dialog:${id}`, label: `${pageURL} — ${id}` };
  // A local fingerprint fallback; raw text is never saved or sent externally.
  const text = node.textContent.replace(/\s+/g, ' ').trim().slice(0, 2000);
  return { identity: `${pageURL}|content:${text || node.tagName}`, label: `${pageURL} — unidentified overlay` };
}
