// Pixel clues, not a semantic judgment that a camera is broken or a road is safe.
export function assessPixels(image) {
  if (!image?.data?.length || !image.width || !image.height || image.data.length !== image.width * image.height * 4) return { state: 'unknown' }
  let sum = 0, square = 0, edges = 0, last = 0
  for (let i = 0; i < image.data.length; i += 4) {
    const y = image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114
    sum += y; square += y * y
    if ((i / 4) % image.width) edges += Math.abs(y - last)
    last = y
  }
  const count = image.width * image.height, mean = sum / count, deviation = Math.sqrt(Math.max(0, square / count - mean * mean))
  return { state: mean < 20 ? 'dark' : deviation < 6 ? 'low-detail' : 'readable', mean, deviation, edge: edges / count }
}
