// Teaching readiness, shared by the instruction and the action gate.
export const MIN_EXAMPLES = 3

export function setupState(classes, hasPicture) {
  const missing = classes.reduce((sum, c) => sum + Math.max(0, MIN_EXAMPLES - c.samples.length), 0)
  const taught = classes.length >= 2 && missing === 0
  return { missing, taught, stage: !hasPicture ? 'picture' : taught ? 'ready' : 'examples' }
}
