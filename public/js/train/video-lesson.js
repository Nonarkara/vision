import { t, onLang, count } from '../core/i18n.js?v=1.24.3'
import { runLens, createLensState } from '../cv/lenses.js?v=1.24.3'
import { snapshot, shrink, embed, isBusy, isLoaded } from './eye.js?v=1.24.3'
import { classify, cluster, groupOf, policy } from './video-learning.js?v=1.24.3'
import { threeWayState, actionLabel } from './three-ways.js?v=1.24.3'
import { frameKey, testEligibility, testSummary } from './holdout.js?v=1.24.3'
import { practiceVideo } from './practice-video.js?v=1.24.3'

export function mountVideoLesson(specimen) {
  const root = document.querySelector('[data-video-lesson]'),
    $ = (s) => root.querySelector(s)
  let tests = [], testPending = null, lastTest = null
  const sourceIds = new WeakMap()
  let nextSourceId = 0
  function sourceIdentity(src) {
    const camera = src?.cam?.id ?? src?.credit?.id
    if (camera) return { id: camera, camera: true }
    if (!sourceIds.has(src)) sourceIds.set(src, `local-${++nextSourceId}`)
    return { id: sourceIds.get(src), camera: false }
  }
  let mode = 'supervised',
    labels = [],
    frames = [],
    groups = null,
    feedback = [],
    learned = false,
    pending = null,
    busy = false,
    collecting = false,
    job = 0,
    review = null,
    visible = true,
    lastResult = '',
    prediction = null,
    rounds = 0,
    stopped = false,
    timer = null,
    statusText = null,
    comparisonText = null,
    // The one frame all three learners were asked about, and its own ticket:
    // asking must never cancel a lesson that is already running.
    lastAsk = null,
    askJob = 0
  const names = [t('ถนนรถแน่น', 'Busy road'), t('ถนนโล่ง', 'Quiet road')],
    named = [false, false]
  root.querySelectorAll('[data-lesson-name]').forEach((el, i) => {
    el.value = names[i]
    el.addEventListener('input', () => {
      named[i] = true
      names[i] = el.value.trim() || t(`กลุ่ม ${i + 1}`, `Group ${i + 1}`)
      paint()
    })
  })
  function status(th, en) {
    statusText = [th, en]
    $('[data-lesson-status]').textContent = t(th, en)
  }
  function comparisonStatus(th, en) {
    comparisonText = [th, en]
    $('[data-three-status]').textContent = t(th, en)
  }
  const reviewingSource = {
    ready: true,
    width: 224,
    height: 126,
    drawTo(g, w, h) {
      const c = review
      if (!c) return
      const s = Math.min(w / c.width, h / c.height),
        dw = c.width * s,
        dh = c.height * s
      g.drawImage(c, (w - dw) / 2, (h - dh) / 2, dw, dh)
    },
  }
  const lens = runLens(
    $('[data-lesson-view]'),
    () => (review ? reviewingSource : specimen.source),
    () => ({ name: 'picture' }),
    { fps: 15, state: createLensState() },
  )
  const observer = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
  })
  observer.observe(root)
  function paint() {
    root
      .querySelectorAll('[data-method]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.method === mode)),
      )
    root
      .querySelectorAll('[data-method-panel]')
      .forEach((p) => (p.hidden = p.dataset.methodPanel !== mode))
    const counts = [0, 1].map((y) => labels.filter((s) => s.y === y).length)
    root.querySelectorAll('[data-label-frame]').forEach((b) => {
      const y = Number(b.dataset.labelFrame)
      b.disabled = busy || !!review || counts[y] >= 30
      const title = document.createElement('strong')
      title.textContent = names[y]
      const progress = document.createElement('small')
      progress.textContent = t(`+ เพิ่มภาพ · ${counts[y]} / 3 ภาพเริ่มต้น`, `+ Add example · ${counts[y]} / 3 to start`)
      if (counts[y] >= 3) progress.textContent = t(`+ เพิ่มอีก · เก็บแล้ว ${counts[y]} ภาพ`, `+ Add more · ${count(counts[y], 'example')} saved`)
      b.replaceChildren(title, progress)
    })
    $('[data-lesson-counts]').textContent = names
      .map((name, i) => counts[i] < 3 ? `${name}: ${counts[i]} / 3 ${t("ภาพเริ่มต้น", "to get started")}` : `${name}: ${counts[i]} ${t("ภาพ · พร้อม", "examples · ready")}`)
      .join(' · ')
    paintSamples()
    paintThreeWays()
    paintTest()
    $('[data-lesson-learn]').disabled = busy || !!review || counts.some((n) => n < 3)
    $('[data-lesson-collect]').disabled = busy
    $('[data-three-ask]').disabled = busy
    $('[data-lesson-act]').disabled = busy || !!pending
    root
      .querySelectorAll('[data-reward]')
      .forEach((b) => (b.disabled = !pending))
    $('[data-lesson-step]').textContent =
      mode === 'supervised'
        ? t(
            `${learned ? 'ลองกับภาพใหม่' : 'บอกคำตอบที่ถูกต้อง'}`,
            `${learned ? 'Test on new frames' : 'Show it the right answer'}`,
          )
        : mode === 'unsupervised'
          ? t(
              `${groups ? 'สำรวจกลุ่มที่พบ' : 'เก็บภาพโดยไม่ตั้งชื่อ'}`,
              `${groups ? 'Explore its groups' : 'Collect without labels'}`,
            )
          : t(`ให้รางวัลกับการเลือก`, `Reward its choices`)
    $('[data-lesson-help]').textContent =
      mode === 'supervised'
        ? t(
            learned
              ? 'สอนแล้ว! เปลี่ยนฉากรถแน่นหรือถนนโล่ง แล้วดูคำทายบนวิดีโอ ถ้าผิด ให้เพิ่มตัวอย่างแล้วกดเรียนอีกครั้ง'
              : counts[0] < 3
                ? `กดปุ่ม “${names[0]}” เพื่อเก็บภาพที่ตรงกันอีก ${3 - counts[0]} ภาพ${specimen.source?.kind === 'practice' ? ' เลือกฉากที่ตรงกันใต้จอ' : ''}`
                : counts[1] < 3
                  ? `เปลี่ยนเป็นอีกฉากใต้จอ แล้วกดปุ่ม “${names[1]}” เพื่อเก็บอีก ${3 - counts[1]} ภาพ`
                  : 'พร้อมแล้ว! กด “เรียนจากคำตอบของฉัน” แล้วสลับฉากเพื่อทดสอบ',
            learned
              ? 'You taught it! Switch between busy and quiet scenes and watch its guess. If it is wrong, add examples and press Learn again.'
              : counts[0] < 3
                ? `Save ${count(3 - counts[0], "more picture", "more pictures")} of “${names[0]}” with its button.${specimen.source?.kind === 'practice' ? ' Choose a matching scene below.' : ''}`
                : counts[1] < 3
                  ? `Switch to the other scene below the video. Save ${count(3 - counts[1], "more picture", "more pictures")} of “${names[1]}” with its button.`
                  : 'Ready! Press “Learn from my answers”, then switch scenes to test it.',
          )
        : mode === 'unsupervised'
          ? t(
              'เครื่องจัดภาพที่คล้ายกันไว้ด้วยกัน คุณค่อยดูว่ากลุ่มนั้นหมายถึงอะไร อาจแยกตามแสงแทนจำนวนรถ',
              'It puts similar pictures together. You decide what the groups mean afterwards. It might group by lighting instead of traffic.',
            )
          : t(
              'นี่คือการลองแล้วเรียนจากรางวัล คุณให้คะแนนการกระทำ ไม่ได้ตั้งชื่อภาพ การลองครั้งต่อไปใช้คะแนนที่เคยได้',
              'This is trial and reward. You rate an action, rather than name a picture. Future choices use the rewards it received.',
            )
    $('[data-lesson-limit]').textContent =
      mode === 'supervised'
        ? t(
            'วิธีนี้เรียนจากตัวอย่างที่มีคำตอบ ใช้เพื่อนบ้านใกล้สุด ไม่ใช่คะแนนสอบ ลองเฟรมที่ไม่ได้เก็บ และเพิ่มตัวอย่างเมื่อทายผิด',
            'Supervised learning uses your labelled examples and nearest neighbours. The vote is not a test score. Try frames you did not collect; add examples when it is wrong.',
          )
        : mode === 'unsupervised'
          ? t(
              'นี่คือ k-means ที่เรียนสองกลุ่มจากข้อมูลจริง ไม่ได้รู้ว่ากลุ่มไหนคือรถแน่น กลุ่มอาจมีจำนวนไม่เท่ากัน',
              'This is real two-group k-means on the collected frames. It does not know which group means busy. Groups may have different sizes.',
            )
          : t(
              'นี่คือ contextual bandit แบบการกระทำเดียว: แจ้งเตือนหรือเงียบ เรียนจากรางวัลที่คุณให้ ไม่มีผลต่อการจราจร และไม่ใช่การฝึกขับรถหลายขั้น',
              'This is a one-step contextual bandit: alert or stay quiet. It learns from your rewards. It does not change traffic or train a multi-step driving policy.',
            )
    const src = specimen.source
    $('[data-practice-controls]').hidden = src?.kind !== 'practice'
    $('[data-lesson-practice]').setAttribute('aria-pressed', String(src?.kind === 'practice'))
    root.querySelectorAll('[data-practice-scene]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.practiceScene === src?.sceneMode))
      button.disabled = busy || !!pending || !!review
    })
    $('[data-lesson-source]').textContent =
      src?.kind === 'practice'
        ? t('ภาพจากกล้องสาธารณะ', 'Public-camera footage', '公共摄像头画面')
        : src?.kind === 'still' || src?.kind === 'photo'
          ? t(
              'ภาพนิ่ง — เปลี่ยนกล้องเพื่อให้เห็นความต่าง',
              'Still image — change source for varied examples',
            )
          : src
            ? t('วิดีโอ / ภาพเคลื่อนไหว', 'Moving video')
            : t('ยังไม่มีภาพ', 'No source')
    $('[data-lesson-rewards]').textContent = t(
      `ให้คะแนนแล้ว ${rounds} ครั้ง · เครื่องยังลองอีกทางเป็นระยะ`,
      `Rated ${count(rounds, "choice")} · it still explores the other action sometimes`,
    )
    $('[data-lesson-action]').textContent = pending
      ? t(
          `ภาพค้างเพื่อให้คะแนน: ${actionLabel(pending.action, t)} · ${pending.exploring ? 'กำลังลอง' : 'ใช้รางวัลที่ผ่านมา'}`,
          `Frame held for feedback: ${actionLabel(pending.action, t)} · ${pending.exploring ? 'exploring' : 'using earlier rewards'}`,
        )
      : t(
          'กดลองเลือกการกระทำ แล้วให้คะแนนภาพนั้น',
          'Press Try an action, then rate that frame.',
        )
    const held = $('[data-lesson-held]')
    held.hidden = !pending
    if (review && pending) {
      const g = held.getContext('2d')
      g.clearRect(0, 0, 224, 126)
      reviewingSource.drawTo(g, 224, 126)
    }
    paintResult()
  }
  function paintSamples() {
    const el = $('[data-lesson-samples]')
    el.replaceChildren()
    for (let y = 0; y < 2; y++) {
      const samples = labels.filter(sample => sample.y === y)
      if (!samples.length) continue
      const group = document.createElement('div')
      const caption = document.createElement('p')
      caption.className = 'micro'
      caption.textContent = t('ภาพที่คุณตั้งชื่อ: ', 'Your examples: ') + names[y]
      const strip = document.createElement('div')
      strip.className = 'lesson-sample-strip'
      for (const sample of samples.slice(-3)) {
        sample.thumb.setAttribute('role', 'img')
        sample.thumb.setAttribute('aria-label', t('ตัวอย่างที่คุณตั้งชื่อว่า ', 'Example you labelled ') + names[y])
        strip.append(sample.thumb)
      }
      const undo = document.createElement('button')
      undo.type = 'button'
      undo.className = 'btn'
      undo.textContent = t('ลบภาพล่าสุด: ', 'Undo last: ') + names[y]
      undo.disabled = busy || !!review
      undo.addEventListener('click', () => {
        job++
        labels.splice(labels.lastIndexOf(samples.at(-1)), 1)
        tests = []; lastTest = null
        learned = false
        prediction = null
        status('ลบภาพล่าสุดแล้ว ตรวจตัวอย่าง แล้วกดเรียนเมื่อพร้อม', 'Last example removed. Check your examples, then Learn when ready.')
        paint()
      })
      group.append(caption, strip, undo)
      el.append(group)
    }
  }
  function paintResult() {
    let text = t('ยังไม่ได้สอน', 'Waiting for your lesson'),
      explain = t(
        mode === 'supervised' ? 'เพิ่มตัวอย่างด้วยปุ่มสอน กดเรียน แล้วคำทายจะปรากฏตรงนี้' : mode === 'unsupervised' ? 'กดเก็บภาพ แล้วกลุ่มที่พบจะปรากฏตรงนี้' : 'กดลองทำ แล้วให้คะแนนการกระทำที่แสดงตรงนี้',
        mode === 'supervised' ? 'Add examples with the buttons. After Learn, its guess appears here.' : mode === 'unsupervised' ? 'Collect frames, then its group will appear here.' : 'Press Try an action, then rate the action shown here.',
      )
    if (testPending) {
      text = names[testPending.guess]
      explain = t('ภาพทดสอบค้างไว้ เลือกคำตอบจริง ยังไม่เพิ่มเป็นตัวอย่างสอน', 'Test frame held. Choose the true answer; this is not a training example.', '测试画面已暂停。请选择真实答案；它尚未作为训练样本。')
    } else if (review && lastTest && mode === 'supervised') {
      text = names[lastTest.guess]
      explain = t('คำตอบที่คุณตรวจ: ', 'Your checked answer: ', '你核对的答案：') + (lastTest.truth === null ? t('ดูไม่ออก', 'Cannot tell', '无法判断') : names[lastTest.truth])
    } else if (review && pending) {
      text = actionLabel(pending.action, t)
      explain = t(
        'ภาพนี้ค้างไว้เพื่อให้คะแนนการกระทำ ไม่ใช่ผลตรวจนับรถ',
        'This frame is held so you can rate its action. This is not a vehicle count.',
      )
    } else if (prediction && prediction.mode === mode) {
      text = prediction.text
      explain = prediction.explain
    }
    $('[data-lesson-result]').textContent = text
    $('[data-lesson-explain]').textContent = explain
  }
  function cancel() {
    job++
    collecting = false
    busy = false
    pending = null
    testPending = null
    review = null
    paint()
  }
  specimen.on(() => {
    cancel()
    lastResult = ''
    prediction = null
    status(
      'ภาพเปลี่ยนแล้ว สิ่งที่เรียนยังอยู่ ลองดูผลกับภาพใหม่นี้',
      'Source changed. Learning is kept so you can test on this new view.',
    )
    paint()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && collecting) {
      cancel()
      status(
        'หยุดเก็บภาพเมื่อซ่อนแท็บ กดเริ่มใหม่เมื่อพร้อม',
        'Collection stopped while the tab was hidden. Start again when ready.',
      )
    }
  })
  root.querySelectorAll('[data-method]').forEach((b) =>
    b.addEventListener('click', () => {
      cancel()
      mode = b.dataset.method
      prediction = null
      status(
        'เลือกวิธีแล้ว ทำตามขั้นข้างจอ',
        'Method selected. Follow the next step beside the screen.',
      )
      paint()
    }),
  )
  root.querySelectorAll('[data-practice-scene]').forEach(button => button.addEventListener('click', () => {
    const source = specimen.source
    if (source?.kind !== 'practice' || busy || pending) return
    source.setScene(button.dataset.practiceScene)
    lastResult = ''
    paint()
  }))
  $('[data-lesson-practice]').addEventListener('click', () => {
    const clip = practiceVideo()
    clip.setScene('busy')
    specimen.useLocal(clip)
  })
  $('[data-lesson-camera]').addEventListener('click', () => {
    specimen.next()
  })
  $('[data-lesson-file]').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    status('กำลังเปิดวิดีโอในเครื่อง…', 'Opening your video locally…')
    try {
      await specimen.useVideo(file)
    } catch {
      status(
        'เปิดวิดีโอไม่ได้ ลองไฟล์อื่น',
        'Could not open that clip. Try another file.',
      )
    }
  })
  async function read(report = status) {
    const c = snapshot(specimen.source)
    if (!c) throw Error('No frame')
    report(
      isLoaded() ? 'กำลังอ่านภาพ…' : 'กำลังโหลดโมเดล 14 MB ครั้งแรก… ภาพที่เลือกถูกเก็บไว้แล้ว',
      isLoaded() ? 'Reading the frame…' : 'Loading the 14 MB model for first use… Your chosen frame is already held.',
    )
    const key = frameKey(c.getContext('2d').getImageData(0, 0, c.width, c.height))
    const source = sourceIdentity(specimen.source)
    return { x: await embed(c), thumb: shrink(c), canvas: c, key, source }
  }
  root.querySelectorAll('[data-label-frame]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (busy) return
      const y = Number(b.dataset.labelFrame),
        ticket = ++job
      busy = true
      paint()
      try {
        const sample = await read()
        if (ticket !== job) return
        if (labels.some(s => s.key === sample.key)) {
          status('เก็บภาพนี้แล้ว รอภาพเปลี่ยนหรือเลือกอีกฉาก', 'This picture is already saved. Wait for a new frame or choose another scene.')
          return
        }
        labels.push({ ...sample, y })
        tests = []; lastTest = null
        learned = false
        prediction = null
        status(
          'เพิ่มภาพแล้ว เก็บอีกกลุ่มด้วย แล้วกดเรียน',
          'Frame added. Collect the other group too, then press Learn.',
        )
      } catch {
        status(
          'อ่านภาพไม่สำเร็จ ลองอีกครั้งหรือเปลี่ยนวิดีโอ',
          'Could not read the frame. Retry or change video.',
        )
      } finally {
        if (ticket === job) {
          busy = false
          paint()
        }
      }
    }),
  )
  $('[data-lesson-learn]').addEventListener('click', () => {
    if (busy || testPending || [0, 1].some(y => labels.filter(s => s.y === y).length < 3)) return
    learned = true
    tests = []; lastTest = null
    lastResult = ''
    status(
      'เรียนแล้ว ดูคำตอบบนวิดีโอ ลองเฟรมใหม่ที่ไม่ได้เก็บ',
      'Learned. Watch the video answer. Test on frames you did not collect.',
    )
    paint()
  })
  function paintTest() {
    const panel = $('[data-lesson-test-panel]')
    panel.hidden = mode !== 'supervised' || !learned
    $('[data-lesson-test]').disabled = !learned || busy || !!testPending || tests.length >= 100
    $('[data-test-review]').hidden = !testPending
    const picture = $('[data-test-view]')
    picture.hidden = !review || mode !== 'supervised'
    if (!picture.hidden) { const g = picture.getContext('2d'); g.clearRect(0, 0, picture.width, picture.height); g.drawImage(review, 0, 0, picture.width, picture.height) }
    $('[data-test-live]').hidden = !review || !!pending || !!testPending
    $('[data-test-correct]').hidden = !review || !lastTest || lastTest.truth === null || !!testPending
    for (const b of root.querySelectorAll('[data-test-label]')) b.textContent = names[Number(b.dataset.testLabel)]
    const result = testSummary(tests)
    $('[data-test-summary]').textContent = result.assessed
      ? t(`ทายตรง ${result.correct}/${result.assessed} ภาพที่คุณตรวจ · ไม่แน่ใจ ${result.unsure} · เป็นผลทดสอบของโมเดลรอบนี้เท่านั้น`, `Matched ${result.correct}/${result.assessed} pictures you checked · unsure ${result.unsure} · this model revision only`, `你检查的图片中匹配 ${result.correct}/${result.assessed} 张 · 不确定 ${result.unsure} 张 · 仅适用于本轮模型`)
      : t('ยังไม่มีภาพทดสอบที่ตรวจคำตอบ ไม่ใช่คะแนน 0%', 'No checked test pictures yet. This is not a score of 0%.', '尚无已核对的测试图，这并不表示得分为 0%。')
  }
  $('[data-lesson-test]').addEventListener('click', async () => {
    if (!learned || busy || testPending) return
    const ticket = ++job
    busy = true; paint()
    try {
      const sample = await read()
      if (ticket !== job) return
      const eligibility = testEligibility(sample.key, labels, tests)
      if (eligibility !== 'new') {
        status('ภาพนี้เคยใช้แล้ว รอภาพใหม่หรือเปลี่ยนกล้อง แล้วลองอีกครั้ง', 'This picture has already been used. Wait for a new frame or change camera, then retry.')
        return
      }
      const guess = classify(labels, sample.x)
      testPending = { ...sample, guess: guess.y, truth: null }
      review = sample.canvas
      const sameSource = labels.some(s => s.source.id === sample.source.id)
      status('ค้างภาพทดสอบแล้ว เลือกคำตอบจริง ภาพต่างเฟรมจากกล้องเดิมอาจคล้ายกันมาก', sameSource ? 'New frame, same training source. This does not test transfer to another camera. Choose the true answer.' : 'This picture was not saved in training. Choose the true answer. This checks this picture, not general accuracy.')
    } catch { if (ticket === job) status('อ่านภาพทดสอบไม่ได้ ลองอีกครั้ง', 'Could not read a test frame. Try again.') }
    finally { if (ticket === job) { busy = false; paint() } }
  })
  function judgeTest(truth) {
    if (!testPending) return
    lastTest = { ...testPending, truth }
    tests.push({ key: lastTest.key, guess: lastTest.guess, truth })
    testPending = null
    status('บันทึกผลทดสอบแล้ว ยังไม่เปลี่ยนตัวอย่างสอน ถ้าต้องการสอนเพิ่ม ให้กดใช้คำตอบนี้สอน', 'Test recorded. Training examples are unchanged. Use “Teach this answer” only if you want to add it.')
    paint()
  }
  root.querySelectorAll('[data-test-label]').forEach(b => b.addEventListener('click', () => judgeTest(Number(b.dataset.testLabel))))
  $('[data-test-unsure]').addEventListener('click', () => judgeTest(null))
  $('[data-test-live]').addEventListener('click', () => { review = null; prediction = null; lastResult = ''; paint() })
  $('[data-test-correct]').addEventListener('click', () => {
    if (!lastTest || lastTest.truth === null || busy) return
    if (labels.filter(s => s.y === lastTest.truth).length >= 30) { status('กลุ่มนี้เต็มแล้ว ลบตัวอย่างก่อนเพิ่ม', 'This group is full. Remove an example before adding another.'); return }
    labels.push({ ...lastTest, y: lastTest.truth })
    learned = false; tests = []; lastTest = null; review = null; prediction = null
    status('เพิ่มคำตอบนี้เป็นตัวอย่างแล้ว กดเรียนใหม่ ผลทดสอบเดิมถูกล้างเพราะโมเดลเปลี่ยน', 'Answer added as a training example. Learn again. Earlier test results were cleared because the model changes.')
    paint()
  })
  /**
   * One picture, three answers.
   *
   * The room used to teach each method on its own, so the difference between
   * them was left for the reader to work out. Here the same frame goes to all
   * three learners at once: the supervised one answers in a word you named,
   * the unsupervised one in a group name it chose, and the reinforcement one
   * with an action rather than a label at all.
   *
   * The words themselves live in `three-ways.js`, which holds no DOM — that is
   * what lets the comparison be checked without a browser.
   */
  function paintThreeWays() {
    const state = threeWayState({
      labels,
      learned,
      groups,
      feedback,
      rounds,
      ask: lastAsk,
      names,
      t,
    })
    root.querySelectorAll('.three-way').forEach((card) => {
      const row = state[card.dataset.way]
      if (!row) return
      const answer = card.querySelector('[data-way-answer]')
      const need = card.querySelector('[data-way-need]')
      if (answer.textContent !== row.answer) answer.textContent = row.answer
      if (need.textContent !== row.need) need.textContent = row.need
    })
  }

  $('[data-three-ask]').addEventListener('click', async () => {
    if (busy) return
    const ticket = ++askJob
    busy = true
    paint()
    try {
      const sample = await read(comparisonStatus)
      if (ticket !== askJob) return
      lastAsk = sample
      const view = $('[data-three-view]')
      view.hidden = false
      // The full frame, not the 96px strip thumbnail: the picture in the card
      // has to be the picture the machine saw, not a blurred copy of it.
      view.getContext('2d').drawImage(sample.canvas, 0, 0, view.width, view.height)
      comparisonStatus(
        'ถามทั้งสามแล้ว — ดูว่าคำตอบต่างกันยังไง',
        'Asked all three. Watch how the answers differ.',
      )
    } catch {
      if (ticket === askJob) comparisonStatus('อ่านภาพไม่สำเร็จ ลองอีกครั้ง', 'Could not read the frame. Try again.')
    } finally {
      if (ticket === askJob) {
        busy = false
        paint()
      }
    }
  })

  function paintGroups() {
    const el = $('[data-lesson-groups]')
    el.replaceChildren()
    if (!groups) return
    for (let y = 0; y < 2; y++) {
      const group = document.createElement('div'),
        title = document.createElement('strong')
      title.textContent = t(
        `กลุ่ม ${y + 1} · ${groups.groups.filter((v) => v === y).length} ภาพ`,
        `Group ${y + 1} · ${count(groups.groups.filter((v) => v === y).length, "frame")}`,
      )
      group.append(title)
      frames
        .filter((_, i) => groups.groups[i] === y)
        .slice(0, 4)
        .forEach((s) => group.append(s.thumb))
      el.append(group)
    }
  }
  $('[data-lesson-collect]').addEventListener('click', async () => {
    if (busy) return
    if (!specimen.source?.moving) {
      status(
        'ภาพนี้ไม่เคลื่อนไหว เลือกวิดีโอฝึกหรือวิดีโอของคุณก่อน',
        'This source is still. Choose the practice video or your own clip first.',
      )
      return
    }
    if (specimen.source.kind === 'practice') specimen.source.setScene('auto')
    const ticket = ++job
    busy = true
    collecting = true
    frames = []
    groups = null
    prediction = null
    paint()
    paintGroups()
    try {
      for (let i = 0; i < 24; i++) {
        if (ticket !== job) return
        if (document.hidden || !visible) throw Error('Paused')
        const sample = await read()
        if (ticket !== job) return
        frames.push(sample)
        status(
          `เก็บภาพ ${i + 1} / 24 — ไม่ต้องตั้งชื่อ`,
          `Collecting ${i + 1} / 24 frames — no labels needed`,
        )
        if (i < 23) await new Promise((r) => setTimeout(r, 1000))
      }
      groups = cluster(frames.map((s) => s.x))
      status(
        groups
          ? 'หากลุ่มแล้ว ดูภาพตัวอย่าง และติดตามกลุ่มบนวิดีโอ'
          : 'ภาพคล้ายกันเกินไป ลองวิดีโอที่เปลี่ยนชัดกว่านี้',
        groups
          ? 'Groups found. Inspect their examples and watch the live group.'
          : 'Frames are too similar. Try a video with clearer changes.',
      )
      paintGroups()
      lastResult = ''
    } catch {
      if (ticket === job)
        status(
          'หยุดเก็บภาพ ลองใหม่เมื่อจอแสดงอยู่และวิดีโอพร้อม',
          'Collection stopped. Try again with this screen visible and a ready video.',
        )
    } finally {
      if (ticket === job) {
        busy = false
        collecting = false
        paint()
      }
    }
  })
  $('[data-lesson-act]').addEventListener('click', async () => {
    if (busy || pending) return
    const ticket = job
    busy = true
    paint()
    try {
      const sample = await read()
      if (ticket !== job) return
      pending = { ...sample, ...policy(feedback, sample.x, rounds) }
      review = sample.canvas
      status(
        'ให้คะแนนการกระทำกับภาพที่ค้างอยู่นี้',
        'Rate the action for this held frame.',
      )
    } catch {
      status('อ่านภาพไม่ได้ ลองใหม่', 'Could not read the frame. Retry.')
    } finally {
      if (ticket === job) {
        busy = false
        paint()
      }
    }
  })
  root.querySelectorAll('[data-reward]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!pending) return
      rounds++
      feedback.push({
        x: pending.x,
        action: pending.action,
        reward: Number(b.dataset.reward),
      })
      if (feedback.length > 60) feedback.shift()
      pending = null
      review = null
      lastResult = ''
      status(
        'จำรางวัลแล้ว ลองเฟรมใหม่ จะเห็นการเลือกเปลี่ยนไปตามคะแนน',
        'Reward remembered. Try a new frame to see its choices respond to feedback.',
      )
      paint()
    }),
  )
  $('[data-lesson-reset]').addEventListener('click', () => {
    cancel()
    if (mode === 'supervised') {
      labels = []
      tests = []; lastTest = null
      learned = false
    } else if (mode === 'unsupervised') {
      frames = []
      groups = null
      paintGroups()
    } else {
      feedback = []
      rounds = 0
    }
    prediction = null
    status(
      'ล้างวิธีนี้แล้ว วิดีโอยังเล่นอยู่',
      'This method was cleared. The video keeps playing.',
    )
    paint()
  })
  async function tick() {
    if (stopped) return
    try {
      const src = specimen.source,
        ready =
          mode === 'supervised'
            ? learned
            : mode === 'unsupervised'
              ? groups
              : feedback.length
      if (
        ready &&
        !busy &&
        !isBusy() &&
        !document.hidden &&
        visible &&
        !review &&
        src?.ready
      ) {
        const key = src.moving ? '' : `${src.frameAt}:${job}:${mode}`
        if (src.moving || key !== lastResult) {
          const ticket = job,
            m = mode,
            x = await embed(snapshot(src))
          if (ticket === job && m === mode) {
            lastResult = key
            let text, explain
            if (m === 'supervised') {
              const result = classify(labels, x)
              text = names[result.y]
              explain = t(
                `เพื่อนบ้านโหวต ${Math.round(result.score * 100)}% — อาจผิดได้`,
                `Neighbour vote ${Math.round(result.score * 100)}% — it can still be wrong`,
              )
            } else if (m === 'unsupervised') {
              text = t(
                `คล้ายกลุ่ม ${groupOf(groups.centres, x) + 1}`,
                `Looks like group ${groupOf(groups.centres, x) + 1}`,
              )
              explain = t(
                'ไม่มีชื่อคำตอบ เครื่องรู้แค่ความคล้ายของภาพ',
                'No answer names. It learned visual similarity only.',
              )
            } else {
              const result = policy(feedback, x, rounds)
              text = actionLabel(result.action, t)
              explain = t(
                'ข้อเสนอจากรางวัลที่ผ่านมา กดลองเพื่อให้คะแนนอีกครั้ง',
                'Suggested from earlier rewards. Press Try an action to rate another choice.',
              )
            }
            prediction = { mode: m, text, explain }
            paintResult()
          }
        }
      }
    } catch {
      /* keep last answer if a frame drops */
    }
    if (!stopped) timer = setTimeout(tick, 750)
  }
  onLang(() => {
    if (statusText) status(...statusText)
    if (comparisonText) comparisonStatus(...comparisonText)
    for (let i = 0; i < 2; i++)
      if (!named[i]) {
        names[i] = i ? t('ถนนโล่ง', 'Quiet road') : t('ถนนรถแน่น', 'Busy road')
        root.querySelector(`[data-lesson-name="${i}"]`).value = names[i]
      }
    prediction = null
    lastResult = ''
    paint()
    paintGroups()
  })
  window.addEventListener(
    'pagehide',
    () => {
      stopped = true
      clearTimeout(timer)
      lens.stop()
      observer.disconnect()
      cancel()
      specimen.close()
    },
    { once: true },
  )
  const clip = practiceVideo()
  clip.setScene('busy')
  specimen.useLocal(clip)
  statusText = null
  $('[data-lesson-status]').textContent = ''
  paint()
  tick()
}
