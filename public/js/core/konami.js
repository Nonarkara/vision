// The Konami code, as key values. A finished buffer turns machine vision on.

export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

export function konamiStep(buf, key) {
  const next = [...buf, key].slice(-KONAMI.length)
  const fire = next.length === KONAMI.length && KONAMI.every((k, i) => next[i] === k)
  return { buf: fire ? [] : next, fire }
}
