/** GitHub's heading → anchor rule: lowercase, drop punctuation, spaces → hyphens. */
export function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')
}
