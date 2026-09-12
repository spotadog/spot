const SELECTOR = 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], [class*="skip" i], [id*="skip" i], [data-testid*="skip" i]';
const normalize = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';
export function skipLabel(value) {
  return /^skip (?:this |the |all )?(?:ads?|adverts?|advertisements?|commercials?)(?: now)?[.!»›→\s]*$/.test(normalize(value));
}
function visibleRect(node, doc) {
  if (!node.isConnected || node.closest('[hidden], [inert]') || !node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return null;
  const rect = node.getBoundingClientRect();
  const left = Math.max(0, rect.left), right = Math.min(doc.defaultView.innerWidth, rect.right);
  const top = Math.max(0, rect.top), bottom = Math.min(doc.defaultView.innerHeight, rect.bottom);
  return right > left && bottom > top ? { left, right, top, bottom, width: right - left, height: bottom - top } : null;
}
// Select the dominant visible video before checking playback: a small running
// preview must not substitute for the main player when that player is paused.
export function mainPlayingVideo(doc) {
  const viewportArea = doc.defaultView.innerWidth * doc.defaultView.innerHeight;
  const videos = [...doc.querySelectorAll('video')].map(video => ({ video, rect: visibleRect(video, doc) }))
    .filter(({ rect }) => rect && rect.width >= 300 && rect.height >= 160 && rect.width * rect.height >= viewportArea * 0.15)
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
  const main = videos[0]?.video;
  return main && !main.paused && !main.ended && main.readyState >= 2 && main.currentTime > 0 ? main : null;
}
function playerFor(video, node, doc) {
  const vr = video.getBoundingClientRect(), br = node.getBoundingClientRect();
  // Buttons must sit over or immediately beside the main video, not in a
  // distant sidebar or navigation bar sharing a broad page wrapper.
  if (br.right < vr.left - 64 || br.left > vr.right + 64 || br.bottom < vr.top - 64 || br.top > vr.bottom + 80) return null;
  for (let parent = video.parentElement; parent && parent !== doc.body && parent !== doc.documentElement; parent = parent.parentElement) {
    if (!parent.contains(node)) continue;
    const rect = parent.getBoundingClientRect();
    if (rect.width > vr.width * 1.5 || rect.height > vr.height * 1.8) return null;
    return parent;
  }
  return null;
}
function matchingControl(node, doc, player) {
  const labelledBy = (node.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => doc.getElementById(id)?.textContent || '').join(' ');
  const labels = [node.getAttribute('aria-label'), node.tagName === 'INPUT' ? node.value : node.innerText, node.getAttribute('title'), labelledBy].map(normalize).filter(Boolean);
  // Countdown text is not an invitation to skip yet, even with a stable ARIA label.
  if (labels.some(label => /\b\d+\b/.test(label))) return false;
  if (labels.some(skipLabel)) return true;
  const signature = [node.id, node.getAttribute('class'), node.getAttribute('data-testid')].join(' ').toLowerCase();
  const adSkip = /(?:ad[s]?[-_ ]?skip|skip[-_ ]?ad)/.test(signature);
  const adPlaying = player.matches('.ad-showing, .ad-interrupting, .vjs-ad-playing') || !!player.querySelector('.ad-showing, .ad-interrupting, .vjs-ad-playing');
  return (adSkip || adPlaying) && (labels.length === 0 || labels.every(label => /^(?:skip[.!»›→\s]*|[»›→]+)$/.test(label)));
}
export function clickableSkip(node, doc, video = mainPlayingVideo(doc)) {
  if (!video || !node.isConnected || !node.matches(SELECTOR)) return false;
  // MGP exposes a separate readiness class; its label can update after readiness.
  const adRollControl = node.closest('.adRollSkipButton');
  if (adRollControl && (adRollControl !== node || !node.matches('.skippable') || !node.closest('.adRollContainer') || !node.closest('.adRollRunning'))) return false;
  const player = playerFor(video, node, doc);
  if (!player || !matchingControl(node, doc, player)) return false;
  if (node.matches(':disabled') || node.closest('[inert], [aria-disabled="true"], [hidden]') || !visibleRect(node, doc)) return false;
  if (doc.defaultView.getComputedStyle(node).pointerEvents === 'none') return false;
  return hitPoint(node, doc) !== null;
}
function hitPoint(node, doc) {
  for (const rect of node.getClientRects()) {
    const left = Math.max(0, rect.left), right = Math.min(doc.defaultView.innerWidth, rect.right);
    const top = Math.max(0, rect.top), bottom = Math.min(doc.defaultView.innerHeight, rect.bottom);
    if (right <= left || bottom <= top) continue;
    for (const fraction of [0.5, 0.2, 0.8]) {
      const x = left + (right - left) * fraction, y = top + (bottom - top) * fraction;
      const hit = doc.elementFromPoint(x, y);
      if (hit && node.contains(hit)) return { x, y };
    }
  }
  return null;
}
function activateSkip(node, doc) {
  if (node.matches('.adRollSkipButton.skippable')) {
    // MGP's desktop control handles mouseup; click only cancels propagation.
    // Dispatch only its activation event, avoiding two actions on generic controls.
    const point = hitPoint(node, doc);
    if (!point) return;
    node.dispatchEvent(new doc.defaultView.MouseEvent('mouseup', {
      bubbles: true, cancelable: true, view: doc.defaultView,
      button: 0, buttons: 0, clientX: point.x, clientY: point.y
    }));
  } else node.click();
}
export class AdSkipper {
  constructor(doc, clicked = new Set()) {
    this.doc = doc; this.win = doc.defaultView; this.clicked = clicked;
    this.enabled = false; this.disposed = false;
    this.schedule = () => {
      if (!this.enabled || this.disposed || this.timer) return;
      this.timer = this.win.setTimeout(() => { this.timer = null; this.scan(); }, 100);
    };
    this.observer = new this.win.MutationObserver(this.schedule);
  }
  configure(enabled) {
    if (this.disposed) return;
    if (this.enabled === (enabled === true)) { if (!this.enabled) this.clicked.clear(); return; }
    this.enabled = enabled === true;
    this.stop();
    if (!this.enabled) { this.clicked.clear(); return; }
    this.observer.observe(this.doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
    this.doc.addEventListener('visibilitychange', this.schedule);
    this.win.addEventListener('scroll', this.schedule, true);
    // Also catches CSS animation and property-only changes without DOM mutations.
    this.poll = this.win.setInterval(() => this.scan(), 500);
    this.schedule();
  }
  scan() {
    if (!this.enabled || this.disposed || this.doc.visibilityState !== 'visible') return;
    const video = mainPlayingVideo(this.doc);
    // Losing playback alone must not rearm a button that was already clicked.
    if (!video) { for (const node of this.clicked) if (!node.isConnected) this.clicked.delete(node); return; }
    const eligible = new Set([...this.doc.querySelectorAll(SELECTOR)].filter(node => clickableSkip(node, this.doc, video)));
    // Nested label spans can carry skip classes; click their outer control once.
    for (const node of eligible) if ([...eligible].some(other => other !== node && other.contains(node))) eligible.delete(node);
    for (const node of this.clicked) if (!eligible.has(node)) this.clicked.delete(node);
    for (const node of eligible) {
      // Earlier click handlers can hide, disable or remove another candidate.
      if (!this.enabled || this.disposed) break;
      if (this.clicked.has(node) || !clickableSkip(node, this.doc)) continue;
      this.clicked.add(node);
      activateSkip(node, this.doc);
    }
  }
  stop() {
    this.observer.disconnect();
    this.win.clearTimeout(this.timer); this.timer = null;
    this.win.clearInterval(this.poll); this.poll = null;
    this.doc.removeEventListener('visibilitychange', this.schedule);
    this.win.removeEventListener('scroll', this.schedule, true);
  }
  dispose() { this.disposed = true; this.enabled = false; this.stop(); }
}
