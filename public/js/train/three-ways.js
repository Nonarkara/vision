// One picture, three answers.
//
// The room taught supervised, unsupervised and reinforcement one after
// another, each on its own panel, so a reader could follow any single one of
// them to the end and still not be able to say what the difference was. This
// module is the difference, written down: one frame goes in, three answers
// come out, and each answer says what it still needs from the reader.
//
// It holds no DOM and no state of its own. That is the point — the comparison
// is what the room is for, so it has to be checkable without a browser. The
// translator is passed in because the house's own reaches for the document,
// and node has none.
import { classify, groupOf, policy } from './video-learning.js?v=1.23.1'

/**
 * The name of the two actions, in one place.
 *
 * The card and the room's own panel are the same learner shown twice, so they
 * must not each carry their own copy of this mapping. A card that says "Stay
 * quiet" while the panel directly above it says "Raise alert" would be two
 * different machines, and nothing else in the room would notice.
 */
export function actionLabel(action, t) {
  return action ? t('เงียบ', 'Stay quiet') : t('แจ้งเตือน', 'Raise alert')
}

/**
 * What each of the three cards should say.
 *
 * @param {object} s
 * @param {Array}   s.labels   the frames the reader named
 * @param {boolean} s.learned  whether Learn has been pressed since the last example
 * @param {?object} s.groups   the unsupervised learner's two centres
 * @param {Array}   s.feedback the rewards the reader has given
 * @param {number}  s.rounds   how many rewards have been given
 * @param {?object} s.ask      the frame that was asked of all three
 * @param {string[]} s.names   the two words the reader named
 * @param {Function} t         (th, en) => the sentence in the current language
 * @returns {{supervised: {answer: string, need: string},
 *            unsupervised: {answer: string, need: string},
 *            reinforcement: {answer: string, need: string}}}
 */
export function threeWayState({
  labels = [],
  learned = false,
  groups = null,
  feedback = [],
  rounds = 0,
  ask = null,
  names = [],
  t,
}) {
  // The supervised learner only knows what the reader has actually taught it:
  // the room's own rule is three pictures in each group and then Learn, and
  // adding an example clears what it had learned. Answering from one example
  // would contradict the lesson sitting right above this card.
  const counts = [0, 1].map((y) => labels.filter((s) => s.y === y).length)
  const taught = counts[0] >= 3 && counts[1] >= 3
  const sup = ask && learned ? classify(labels, ask.x) : null
  const uns = ask && groups ? groupOf(groups.centres, ask.x) : null
  const rl = ask ? policy(feedback, ask.x, rounds) : null
  return {
    supervised: sup
      ? {
          answer: names[sup.y],
          need: t(
            'ตอบด้วยคำที่คุณตั้ง — คำนี้เป็นของคุณ แต่ยังทำผิดได้',
            'Answers in your word — that word is yours, but it can still be wrong',
          ),
        }
      : learned
        ? {
            answer: t('พร้อมแล้ว', 'Ready'),
            need: t(
              'ตอบด้วยคำที่คุณตั้ง — กดถามทั้งสามเพื่อดูคำตอบ',
              'Answers in your word — press Ask all three to see it',
            ),
          }
        : taught
          ? {
              // Enough examples are in, but Learn has not been pressed — and
              // adding one more clears what it had learned. Saying "needs 3
              // pictures in each group" here would be false: the reader has
              // them. The one thing left is the button.
              answer: t('ยังไม่รู้', 'Does not know yet'),
              need: t(
                'ตอบด้วยคำที่คุณตั้ง — คุณสอนมันพอแล้ว กดเรียนจากคำตอบของฉัน',
                'Answers in your word — you have taught it enough, press Learn from my answers',
              ),
            }
          : {
              answer: t('ยังไม่รู้', 'Does not know yet'),
              need: t(
                'ตอบด้วยคำที่คุณตั้ง — ต้องการอย่างน้อย 3 ภาพต่อกลุ่มแล้วกดเรียน',
                'Answers in your word — needs 3 pictures in each group, then Learn',
              ),
            },
    unsupervised:
      uns !== null
        ? {
            answer: t(`กลุ่ม ${uns + 1}`, `Group ${uns + 1}`),
            need: t(
              'ตอบด้วยชื่อกลุ่มที่มันตั้งเอง — คุณเป็นคนตั้งว่ากลุ่มนี้คืออะไร',
              'Answers in a group name it chose — you decide what the group means',
            ),
          }
        : groups
          ? {
              answer: t('พร้อมแล้ว', 'Ready'),
              need: t(
                'ตอบด้วยชื่อกลุ่มที่มันตั้งเอง — กดถามทั้งสามเพื่อดูว่าภาพนี้ไปอยู่กลุ่มไหน',
                'Answers in a group name it chose — press Ask all three to see which group this picture lands in',
              ),
            }
          : {
              answer: t('ยังไม่รู้', 'Does not know yet'),
              need: t(
                'ตอบด้วยชื่อกลุ่มที่มันตั้งเอง — ต้องเก็บภาพ 24 ภาพก่อน',
                'Answers in a group name it chose — needs 24 frames first',
              ),
            },
    reinforcement: rl
      ? {
          answer: actionLabel(rl.action, t),
          need: reinforcementNeed(feedback, rl, t),
        }
      : {
          answer: t('พร้อมเลย', 'Ready right away'),
          need: t(
            'ตอบด้วยการกระทำ ไม่ใช่คำตอบ — มันต้องเลือกทันที แม้ยังไม่ได้เรียนอะไรเลย',
            'Answers with an action, not a label — it must pick straight away, with nothing learned',
          ),
        },
  }
}

/**
 * What the reinforcement learner still needs, said honestly.
 *
 * These are four different situations and the card used to call two of them
 * the same thing. "Still exploring, it has no scores yet" was true only
 * before the first reward; after one reward the reader has a score and the
 * card was claiming it had none. And "using the rewards it collected" was
 * true only once BOTH actions have been rated — until then the policy has to
 * try the action nobody has told it about.
 *
 * The second state says "near this picture" on purpose. `scored` is computed
 * over the twelve nearest rewards to the frame that was asked, so with more
 * than twelve rewards in the room an action the reader HAS rated can still
 * have no score near this frame. The card says what is true where it stands.
 */
function reinforcementNeed(feedback, rl, t) {
  if (!feedback.length)
    return t(
      'ตอบด้วยการกระทำ ไม่ใช่คำตอบ — กำลังลองอยู่ เพราะยังไม่มีคะแนน',
      'Answers with an action, not a label — still exploring, it has no scores yet',
    )
  if (!rl.scored[0] || !rl.scored[1])
    return t(
      'ตอบด้วยการกระทำ ไม่ใช่คำตอบ — กำลังลองการกระทำที่ยังไม่มีคะแนนใกล้ภาพนี้',
      'Answers with an action, not a label — trying the action it has no score for near this picture',
    )
  if (rl.exploring)
    return t(
      'ตอบด้วยการกระทำ ไม่ใช่คำตอบ — ลองสลับการกระทำเป็นครั้งคราว แม้มีคะแนนแล้ว',
      'Answers with an action, not a label — it still tries the other action now and then',
    )
  return t(
    'ตอบด้วยการกระทำ ไม่ใช่คำตอบ — ใช้คะแนนที่ผ่านมา',
    'Answers with an action, not a label — using the rewards it collected',
  )
}
