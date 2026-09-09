export const defaults = () => ({ enabled: false, paused: false, speed: 120, pauseAfterPositive: false, revision: 0, documentId: null, url: '', pending: null, visited: [], reason: '' });
export const running = state => state.enabled && !state.paused;
export function transition(previous, action, now = Date.now()) {
  const s = structuredClone(previous);
  const pause = reason => { s.paused = s.enabled; s.pending = null; s.reason = reason; };
  if (action.type === 'set') {
    if (action.enabled !== undefined) {
      if (typeof action.enabled !== 'boolean') throw Error('Invalid Auto Scroll toggle.');
      s.enabled = action.enabled; s.paused = false; s.pending = null; s.visited = []; s.reason = '';
    }
    if (action.paused !== undefined) {
      if (typeof action.paused !== 'boolean' || !s.enabled) throw Error('Enable Auto Scroll first.');
      s.paused = action.paused; s.pending = null; s.reason = ''; // Resume never sets a scroll position.
    }
    if (action.pauseAfterPositive !== undefined) {
      if (typeof action.pauseAfterPositive !== 'boolean') throw Error('Invalid positive keyword pause toggle.');
      s.pauseAfterPositive = action.pauseAfterPositive;
    }
    if (action.speed !== undefined) {
      if (!Number.isInteger(action.speed) || action.speed < 30 || action.speed > 600) throw Error('Choose a speed from 30 to 600 pixels per second.');
      s.speed = action.speed;
    }
  } else if (action.type === 'hello') {
    const automatic = running(s) && s.pending && s.pending.expires > now && (s.pending.target === action.url || (!s.pending.target && new URL(s.url).origin === new URL(action.url).origin)) && !['history', 'reload'].includes(action.kind);
    if (action.kind === 'history' || (s.documentId && (s.documentId !== action.documentId || s.url !== action.url) && !automatic)) pause('Navigation paused');
    if (automatic) s.pending = null;
    s.documentId = action.documentId; s.url = action.url;
  } else {
    if (action.documentId !== s.documentId || (action.type !== 'pause' && action.revision !== s.revision)) return previous;
    if (action.type === 'next') {
      if (!running(s) || s.pending) return previous;
      if (action.target !== null && (typeof action.target !== 'string' || action.target.length > 8192)) throw Error('Invalid next page.');
      const visit = action.target ? s.url : `content:${s.url}:${action.signature}`;
      if (!action.target && (typeof action.signature !== 'string' || action.signature.length > 1024)) throw Error('Invalid next content.');
      if (!action.target && s.visited.includes(visit)) pause('Repeated next page');
      else if (action.target && (!/^https?:\/\//.test(action.target) || action.target === s.url || s.visited.includes(action.target))) { pause('No safe next page'); }
      else if (s.visited.length >= 200) pause('Pagination limit reached');
      else {
        s.visited.push(visit);
        s.pending = { target: action.target, expires: now + 15000 };
      }
    } else if (action.type === 'progress') {
      if (!s.pending || !running(s)) return previous;
      s.pending = null; s.url = action.url;
    } else if (action.type === 'pause') pause(action.reason || 'Paused');
    else throw Error('Unknown scrolling action.');
  }
  s.revision++;
  return s;
}
