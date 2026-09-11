import { locationAllowsPost } from './location-check.js';
import { eyeballLevel, autoPauseColors } from './preferences.js';
import { PositivePause, positiveAtEyeball } from './positive-pause.js';
import { running } from './state.js';
import { nextPage } from './pagination.js';
// All movement uses current scrollY; nothing restores or continually enforces a saved position.
export class AutoNavigator {
  constructor(win, send, findNext = nextPage, positiveRanges = () => []) {
    this.locationHandles = new Set();
    this.eyeballLevel = 50; this.autoPauseColors = autoPauseColors();
    this.positiveRanges = positiveRanges; this.positivePause = new PositivePause();
    this.win = win; this.doc = win.document; this.send = send; this.findNext = findNext;
    this.state = { enabled: false, paused: false, revision: -1 }; this.epoch = 0;
    this.url = this.doc.location.href;
    this.instance = Array.from(win.crypto.getRandomValues(new Uint32Array(4))).join('-');
    this.onHide = () => { this.suspended = true; this.stop(); };
    this.onShow = event => { this.suspended = false; this.hello(event.persisted ? 'history' : this.navigationKind()); };
    this.onHistory = () => { this.stop(); this.hello('history'); };
    this.onClick = event => {
      if (event.isTrusted && event.target.closest?.('a[href], button, [role="button"]')) this.pause('Navigation paused');
    };
    win.addEventListener('pagehide', this.onHide);
    win.addEventListener('pageshow', this.onShow);
    win.addEventListener('popstate', this.onHistory);
    this.hello(this.navigationKind());
  }
  configure(preferences) {
    this.locationCheck = preferences?.locationCheck;
    this.locationHandles = new Set(this.locationCheck?.handles ?? []);
    this.eyeballLevel = eyeballLevel(preferences?.eyeballLevel);
    this.autoPauseColors = autoPauseColors(preferences?.autoPauseColors);
  }
  navigationKind() {
    const type = this.win.performance.getEntriesByType('navigation')[0]?.type;
    return type === 'back_forward' ? 'history' : type === 'reload' ? 'reload' : 'navigate';
  }
  hold() {
    this.syncEpoch = (this.syncEpoch ?? 0) + 1;
    this.blocked = true; this.stop();
    return this.syncEpoch;
  }
  release(state, epoch) {
    if (this.disposed || epoch !== this.syncEpoch) return;
    this.blocked = false;
    const latest = this.deferredState?.revision > state.revision ? this.deferredState : state;
    this.deferredState = null; this.apply(latest);
  }
  async hello(kind) {
    const epoch = this.hold();
    try {
      const state = await this.send('scroll.hello', { kind, instance: this.instance });
      if (epoch === this.syncEpoch) this.url = this.doc.location.href;
      this.release(state, epoch);
    } catch { if (epoch === this.syncEpoch) this.stop(); }
  }
  apply(state) {
    if (this.blocked) {
      if (!this.deferredState || state.revision > this.deferredState.revision) this.deferredState = state;
      return;
    }
    if (this.disposed || this.suspended || state.revision < this.state.revision) return;
    const wasRunning = running(this.state);
    if (!state.enabled || (!state.pauseAfterPositive && !state.slowOnPositive)) this.positivePause.reset();
    this.state = state;
    if (!running(state)) this.stop();
    else if (!this.frame) {
      this.lastFrame = this.win.performance.now(); this.lastCheck = 0;
      this.stableSince = this.lastFrame; this.bottomSince = null;
      this.height = this.doc.scrollingElement?.scrollHeight ?? 0;
      this.observer = new this.win.MutationObserver(() => { this.stableSince = this.win.performance.now(); });
      this.observer.observe(this.doc.body, { subtree: true, childList: true, characterData: true });
      this.doc.addEventListener('click', this.onClick, true);
      this.frame = this.win.requestAnimationFrame(time => this.tick(time));
    }
    if (!wasRunning && running(state)) this.url = this.doc.location.href;
  }
  stop() {
    this.epoch++;
    this.win.cancelAnimationFrame(this.frame); this.frame = null;
    this.observer?.disconnect(); this.observer = null;
    this.doc.removeEventListener('click', this.onClick, true);
    this.busy = false; this.distance = 0;
  }
  async pause(reason) {
    if (!running(this.state)) return;
    const epoch = this.hold();
    // Locally pause immediately, before waiting for the worker or an in-flight next response.
    this.state = { ...this.state, paused: true };
    try { this.release(await this.send('scroll.pause', { revision: this.state.revision, reason }), epoch); } catch { /* Remain stopped. */ }
  }
  signature() {
    const text = (this.doc.querySelector('main, [role="main"]') || this.doc.body).textContent || '';
    return `${this.doc.scrollingElement.scrollHeight}:${text.length}:${text.slice(0, 256)}:${text.slice(-256)}`;
  }
  tick(time) {
    this.frame = null;
    if (!running(this.state) || this.disposed) return;
    const root = this.doc.scrollingElement;
    if (!root) { this.pause('No scrollable content'); return; }
    if (!this.state.pending && !this.busy) {
      const ranges = this.state.slowOnPositive ? this.positiveRanges() : this.state.pauseAfterPositive ? this.positiveRanges(this.autoPauseColors) : [];
      const slow = this.state.slowOnPositive && positiveAtEyeball(this.win, ranges, this.eyeballLevel);
      const speed = this.state.speed * (slow ? 0.25 : 1);
      this.distance = (this.distance ?? 0) + speed * Math.min(time - this.lastFrame, 100) / 1000;
      const pixels = Math.floor(this.distance); this.distance -= pixels;
      const boundary = this.state.pauseAfterPositive && !this.state.slowOnPositive ? this.positivePause.boundary(this.win, ranges, this.eyeballLevel, post => locationAllowsPost(post, this.doc.location.href, this.locationCheck, this.locationHandles)) : null;
      const movement = boundary === null ? pixels : Math.min(pixels, Math.max(0, boundary - this.win.scrollY));
      if (movement) this.win.scrollBy({ top: movement, behavior: 'instant' });
      if (boundary !== null && this.win.scrollY >= boundary - 1) {
        this.positivePause.finish();
        this.pause(this.locationCheck?.enabled ? `Positive keyword — location verified: ${this.locationCheck.location}` : 'Positive keyword at eyeball level');
        return;
      }
    }
    this.lastFrame = time;
    if (time - this.lastCheck >= 500 && !this.busy) {
      this.lastCheck = time;
      if (this.state.pending) {
        if (Date.now() >= this.state.pending.expires) this.pause('Next page did not load');
        else if (this.pendingSignature && this.signature() !== this.pendingSignature && time - this.stableSince >= 1000 && !this.doc.querySelector('[aria-busy="true"]')) this.progress();
      } else if (this.doc.location.href !== this.url) { this.stop(); this.hello('navigate'); return; }
      else {
        if (root.scrollHeight !== this.height) { this.height = root.scrollHeight; this.stableSince = time; this.bottomSince = null; }
        const bottom = this.win.scrollY + this.win.innerHeight >= root.scrollHeight - 3;
        if (!bottom) this.bottomSince = null;
        else {
          this.bottomSince ??= time;
          const quiet = time - Math.max(this.bottomSince, this.stableSince);
          const loading = this.doc.querySelector('[aria-busy="true"]');
          if (quiet >= 4000 && !loading) {
            let next = this.findNext(this.doc);
            if (!next) {
              // A long footer can move a valid pager above the viewport by the time
              // the document ends. Reveal it, then revalidate before authorization.
              const offscreen = this.findNext(this.doc, { includeOffscreen: true });
              if (offscreen) {
                offscreen.node.scrollIntoView({ block: 'center', behavior: 'instant' });
                next = this.findNext(this.doc);
              }
            }
            if (next) this.advance(next);
            else if (quiet >= 12000) this.pause('End of available content');
          }
        }
      }
    }
    if (running(this.state) && !this.frame) this.frame = this.win.requestAnimationFrame(t => this.tick(t));
  }
  async advance(next) {
    if (this.busy || this.state.pending || !running(this.state)) return;
    this.busy = true; const epoch = this.epoch;
    try {
      const revision = this.state.revision;
      const state = await this.send('scroll.next', { revision, target: next.target, signature: this.signature() });
      if (epoch !== this.epoch || this.disposed) return;
      this.apply(state);
      if (!running(this.state) || !this.state.pending || state.revision !== revision + 1) return;
      const current = this.findNext(this.doc);
      if (current?.node !== next.node || current.target !== next.target) { await this.pause('Next page changed'); return; }
      this.pendingSignature = this.signature(); this.pendingHeight = this.doc.scrollingElement.scrollHeight;
      next.node.click();
    } catch { await this.pause('Next page unavailable'); }
    finally { if (epoch === this.epoch) this.busy = false; }
  }
  async progress() {
    this.busy = true; const epoch = this.epoch;
    try {
      const state = await this.send('scroll.progress', { revision: this.state.revision });
      if (epoch !== this.epoch || this.disposed) return;
      this.apply(state);
      if (!running(this.state) || this.state.pending) return;
      // A replaced AJAX page starts at the top; appended infinite content keeps position.
      if (this.doc.scrollingElement.scrollHeight <= this.pendingHeight) this.win.scrollTo({ top: 0, behavior: 'instant' });
      this.positivePause.reset();
      this.pendingSignature = null; this.url = this.doc.location.href;
      this.bottomSince = null; this.stableSince = this.win.performance.now();
    } catch { await this.pause('Next page unavailable'); }
    finally { if (epoch === this.epoch) this.busy = false; }
  }
  dispose() {
    this.disposed = true; this.stop();
    this.win.removeEventListener('pagehide', this.onHide);
    this.win.removeEventListener('pageshow', this.onShow);
    this.win.removeEventListener('popstate', this.onHistory);
  }
}
