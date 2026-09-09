import { element } from './client.js';

// Keep the animated number separate from the surrounding status text.
export function visitCount(node) {
  const number = element('span', undefined, { className: 'visit-count' });
  const suffix = document.createTextNode('');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let previous, animation;
  const stop = () => { animation?.cancel(); animation = undefined; };
  const motionChanged = () => { if (motion.matches) stop(); };
  motion.addEventListener('change', motionChanged);
  return {
    update({ supported, count, enabled }) {
      if (!supported) {
        stop(); previous = undefined;
        node.textContent = 'Open an HTTP/HTTPS tab to see its visit count.';
        return;
      }
      if (previous === undefined) node.replaceChildren(document.createTextNode('Current URL: '), number, suffix);
      number.textContent = String(count);
      suffix.textContent = ` recorded ${count === 1 ? 'visit' : 'visits'}${count > 1 ? ' — visited before' : ''}.${enabled ? '' : ' Tracking is off.'}`;
      if (previous !== undefined && previous !== count) {
        stop();
        if (!motion.matches) animation = number.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.1)', offset: 0.4 },
          { transform: 'scale(1)' }
        ], { duration: 220, easing: 'ease-out' });
      }
      previous = count;
    },
    dispose() { stop(); motion.removeEventListener('change', motionChanged); }
  };
}
