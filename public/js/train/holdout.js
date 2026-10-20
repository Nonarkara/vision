// Pixel identity prevents reusing an exact training/test picture as new evidence.
export function frameKey(image) {
  if (!image?.data?.length) throw Error('No pixels')
  let a = 2166136261, b = 5381
  for (const value of image.data) { a = Math.imul(a ^ value, 16777619); b = Math.imul(b, 33) ^ value }
  return `${image.width}x${image.height}:${a >>> 0}:${b >>> 0}`
}
export function testEligibility(key, training, tests) {
  if (training.some(s => s.key === key)) return 'training'
  if (tests.some(s => s.key === key)) return 'tested'
  return 'new'
}
export function testSummary(tests) {
  const assessed = tests.filter(s => s.truth === 0 || s.truth === 1)
  const correct = assessed.filter(s => s.guess === s.truth).length
  return { assessed: assessed.length, correct, unsure: tests.length - assessed.length, accuracy: assessed.length ? correct / assessed.length : null }
}
