import { t, onLang, count } from '../core/i18n.js'
import { runLens, createLensState } from '../cv/lenses.js'
import { snapshot, shrink, embed, isBusy, isLoaded } from './eye.js'
import { classify, cluster, groupOf, policy } from './video-learning.js'
import { practiceVideo } from './practice-video.js?v=1.17.3'

export function mountVideoLesson(specimen) {
  const root = document.querySelector('[data-video-lesson]'),
    $ = (s) => root.querySelector(s)
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
    statusText = null
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
      b.disabled = busy || counts[y] >= 30
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
    $('[data-lesson-learn]').disabled = busy || counts.some((n) => n < 3)
    $('[data-lesson-collect]').disabled = busy
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
      button.disabled = busy || !!pending
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
          `ภาพค้างเพื่อให้คะแนน: ${pending.action ? 'เงียบ' : 'แจ้งเตือน'} · ${pending.exploring ? 'กำลังลอง' : 'ใช้รางวัลที่ผ่านมา'}`,
          `Frame held for feedback: ${pending.action ? 'Stay quiet' : 'Raise alert'} · ${pending.exploring ? 'exploring' : 'using earlier rewards'}`,
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
      undo.disabled = busy
      undo.addEventListener('click', () => {
        job++
        labels.splice(labels.lastIndexOf(samples.at(-1)), 1)
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
    if (review && pending) {
      text = t(
        pending.action ? 'เงียบ' : 'แจ้งเตือน',
        pending.action ? 'Stay quiet' : 'Raise alert',
      )
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
  async function read() {
    const c = snapshot(specimen.source)
    if (!c) throw Error('No frame')
    status(
      isLoaded() ? 'กำลังอ่านภาพ…' : 'กำลังโหลดโมเดล 14 MB ครั้งแรก… ภาพที่เลือกถูกเก็บไว้แล้ว',
      isLoaded() ? 'Reading the frame…' : 'Loading the 14 MB model for first use… Your chosen frame is already held.',
    )
    return { x: await embed(c), thumb: shrink(c), canvas: c }
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
        labels.push({ ...sample, y })
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
    learned = true
    lastResult = ''
    status(
      'เรียนแล้ว ดูคำตอบบนวิดีโอ ลองเฟรมใหม่ที่ไม่ได้เก็บ',
      'Learned. Watch the video answer. Test on frames you did not collect.',
    )
    paint()
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
              text = t(
                result.action ? 'เงียบ' : 'แจ้งเตือน',
                result.action ? 'Stay quiet' : 'Raise alert',
              )
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
