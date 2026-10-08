import { t, onLang } from '../core/i18n.js'
import { runLens, createLensState } from '../cv/lenses.js'
import { snapshot, shrink, embed, isBusy } from './eye.js'
import { classify, cluster, groupOf, policy } from './video-learning.js'
import { practiceVideo } from './practice-video.js'

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
    timer = null
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
      b.textContent = t('เพิ่มภาพ: ', 'Add frame: ') + names[y]
    })
    $('[data-lesson-counts]').textContent = names
      .map((name, i) => `${name}: ${counts[i]} / 10`)
      .join(' · ')
    $('[data-lesson-learn]').disabled = busy || counts.some((n) => n < 3)
    $('[data-lesson-collect]').disabled = busy
    $('[data-lesson-act]').disabled = busy || !!pending
    root
      .querySelectorAll('[data-reward]')
      .forEach((b) => (b.disabled = !pending))
    const step =
      mode === 'supervised'
        ? learned
          ? 3
          : 2
        : mode === 'unsupervised'
          ? groups
            ? 3
            : 2
          : feedback.length
            ? 3
            : 2
    $('[data-lesson-step]').textContent =
      mode === 'supervised'
        ? t(
            `${step} · ${learned ? 'ลองกับภาพใหม่' : 'บอกคำตอบให้ภาพ'}`,
            `${step} · ${learned ? 'Test on new frames' : 'Name some frames'}`,
          )
        : mode === 'unsupervised'
          ? t(
              `${step} · ${groups ? 'สำรวจกลุ่มที่พบ' : 'เก็บภาพโดยไม่ตั้งชื่อ'}`,
              `${step} · ${groups ? 'Explore its groups' : 'Collect without labels'}`,
            )
          : t(`${step} · ให้รางวัลกับการเลือก`, `${step} · Reward its choices`)
    $('[data-lesson-help]').textContent =
      mode === 'supervised'
        ? t(
            'เลือกปุ่มชื่อที่ตรงกับภาพ เก็บทั้งสองกลุ่ม แล้วกดเรียน ดูว่ามันทายวิดีโอที่เคลื่อนไหวถูกหรือไม่',
            'Choose the name matching the picture. Collect both groups, then press Learn. Watch whether it gets new moving frames right.',
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
    $('[data-lesson-source]').textContent =
      src?.kind === 'still' || src?.kind === 'photo'
        ? t(
            'ภาพนิ่ง — เปลี่ยนกล้องเพื่อให้เห็นความต่าง',
            'Still image — change source for varied examples',
          )
        : src
          ? t('วิดีโอ / ภาพเคลื่อนไหว', 'Moving video')
          : t('ยังไม่มีภาพ', 'No source')
    $('[data-lesson-rewards]').textContent = t(
      `ให้คะแนนแล้ว ${rounds} ครั้ง · เครื่องยังลองอีกทางเป็นระยะ`,
      `Rated ${rounds} choices · it still explores the other action sometimes`,
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
  function paintResult() {
    let text = t('ยังไม่ได้สอน', 'Waiting for your lesson'),
      explain = t(
        'เริ่มที่ปุ่มข้างจอ ผลลัพธ์จะปรากฏตรงนี้',
        'Use the buttons beside the screen. Its result will appear here.',
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
  $('[data-lesson-practice]').addEventListener('click', () => {
    specimen.useLocal(practiceVideo())
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
      'กำลังอ่านภาพ ครั้งแรกโหลดโมเดล 14 MB…',
      'Reading the frame. First use loads a 14 MB model…',
    )
    return { x: await embed(c), thumb: shrink(c), canvas: c }
  }
  root.querySelectorAll('[data-label-frame]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (busy) return
      const y = Number(b.dataset.labelFrame),
        ticket = job
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
        `Group ${y + 1} · ${groups.groups.filter((v) => v === y).length} frames`,
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
  specimen.useLocal(practiceVideo())
  status(
    'เริ่มเลย: เก็บภาพรถแน่น แล้วรอช่วงถนนโล่งเพื่อเก็บอีกกลุ่ม',
    'Start here: add busy frames, then wait for quiet traffic and add that group.',
  )
  paint()
  tick()
}
