// Classic worker: MediaPipe WASM compilation stays off the UI thread.
self.exports = {}
importScripts('/vendor/mediapipe-0.10.32/vision.js')
let model
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      const files = await exports.FilesetResolver.forVisionTasks('/vendor/mediapipe-0.10.32/wasm')
      model = await exports.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/models/hand_landmarker/hand_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numHands: 2,
        minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.6,
      })
      self.postMessage({ type: 'ready' })
    } else if (data.type === 'frame') {
      try { self.postMessage({ type: 'result', result: model.detectForVideo(data.bitmap, data.time) }) }
      finally { data.bitmap.close() }
    }
  } catch (e) { self.postMessage({ type: 'error', message: String(e.message ?? e) }) }
}
