// Classic worker: MediaPipe's WASM loader uses importScripts.
self.exports = {}
importScripts('/vendor/mediapipe-0.10.32/vision.js')
let model
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      const files = await exports.FilesetResolver.forVisionTasks('/vendor/mediapipe-0.10.32/wasm')
      model = await exports.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/models/face_landmarker/face_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numFaces: 2, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: 0.6, minFacePresenceConfidence: 0.6,
      })
      self.postMessage({ type: 'ready' })
    } else if (data.type === 'frame') {
      try { self.postMessage({ type: 'result', result: model.detectForVideo(data.bitmap, data.time), time: data.time }) }
      finally { data.bitmap.close() }
    }
  } catch (e) { self.postMessage({ type: 'error', message: String(e.message ?? e) }) }
}
