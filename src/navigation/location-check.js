import { xHandle } from '../profiles/scout.js';
// Only explicit author metadata is eligible: links in post text, mentions and
// quoted posts must not make the enclosing author's location appear verified.
export function postAuthor(post, base) {
  if (!post) return null;
  const headers = [...post.querySelectorAll('[data-testid="User-Name"]')];
  const header = headers.find(node => !node.closest('[role="link"]') && node.closest('article, [role="article"], [data-testid="UserCell"]') === post);
  const links = header ? [...header.querySelectorAll('a[href]')] : [...post.querySelectorAll('a[rel~="author"][href]')].filter(link => !link.closest('[role="link"]') && link.closest('article, [role="article"], [data-testid="UserCell"]') === post);
  const handles = new Set(links.map(link => xHandle(link.getAttribute('href'), base)).filter(Boolean));
  return handles.size === 1 ? [...handles][0] : null;
}
export function locationAllowsPost(post, base, settings, handles) {
  return !settings?.enabled || handles.has(postAuthor(post, base));
}
