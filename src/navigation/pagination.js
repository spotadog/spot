const region = '[aria-label*="pagination" i], [aria-label*="paging" i], .pagination, .pager, [class*="pagination" i], [data-pagination]';
const nextLabel = /^(?:next(?:\s+page)?|older(?:\s+(?:posts|entries))?|[›»→])$/i;
export function nextPage(doc, { includeOffscreen = false } = {}) {
  for (const node of doc.querySelectorAll('a[href], button, [role="button"], [role="link"]')) {
    const label = (node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '').trim().replace(/\s+/g, ' ');
    const semantic = node.rel?.split(/\s+/).includes('next') || /^next page$/i.test(label);
    if (!semantic && !(node.closest(region) && nextLabel.test(label))) continue;
    if (node.disabled || node.matches(':disabled') || node.closest('[hidden], [inert], [aria-disabled="true"], .disabled')) continue;
    if (node.checkVisibility && !node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height || (!includeOffscreen && (rect.top < 0 || rect.bottom > doc.defaultView.innerHeight))) continue;
    const style = doc.defaultView.getComputedStyle(node);
    if (style.visibility !== 'visible' || style.display === 'none' || style.pointerEvents === 'none') continue;
    if (node.target && node.target !== '_self' || node.hasAttribute('download')) continue;
    let target = null;
    if (node.hasAttribute('href')) {
      try {
        const url = new URL(node.getAttribute('href'), doc.location.href);
        const current = new URL(doc.location.href);
        // No cross-site, fragment-only, script or same-page link navigation.
        if (!/^https?:$/.test(url.protocol) || url.origin !== current.origin || url.href.split('#')[0] === current.href.split('#')[0]) continue;
        target = url.href;
      } catch { continue; }
    }
    return { node, target };
  }
  return null;
}
