// A one-step reward learner (a two-armed bandit), not a navigation model.
import { t, count } from '../core/i18n.js?v=1.24.0'

export function createRewardLearner() {
  const actions = [{ count: 0, value: 0 }, { count: 0, value: 0 }]
  return {
    observe(index, reward) {
      const action = actions[index]
      action.count++
      action.value += (reward - action.value) / action.count
    },
    choose() {
      const unseen = actions.findIndex(action => action.count === 0)
      return unseen >= 0 ? unseen : actions[0].value >= actions[1].value ? 0 : 1
    },
    snapshot() { return actions.map(action => ({ ...action })) },
  }
}

/** The two readout lines under the buttons. English counts go through count(),
 *  so one try on a path reads "1 time" — not "1 times". */
export function describeReward(results, lastAction) {
  const score = result => result.count ? `${result.value >= 0 ? '+' : ''}${result.value.toFixed(2)}` : t('ยังไม่รู้', 'unknown')
  const unknown = results.findIndex(result => result.count === 0)
  const nextIndex = unknown >= 0 ? unknown : results[0].value >= results[1].value ? 0 : 1
  const direction = nextIndex === 0 ? t('ซ้าย', 'left') : t('ขวา', 'right')
  const reason = unknown >= 0
    ? t('ยังไม่เคยลอง จึงสำรวจก่อน', 'it has not tried this path yet')
    : results[0].value === results[1].value
      ? t('คะแนนเท่ากัน ตัวอย่างนี้เลือกซ้ายเมื่อเสมอ', 'the scores are tied; this example breaks ties to the left')
      : t('คะแนนเฉลี่ยที่จำไว้ดีกว่า', 'it has the better average reward')
  return {
    next: t(`ครั้งต่อไปหุ่นยนต์จะเลือก${direction}: ${reason}`, `Next, the robot will choose ${direction}: ${reason}.`),
    values: t(`คะแนนเฉลี่ยที่เรียนรู้: ซ้าย ${score(results[0])} / ขวา ${score(results[1])}`, `Learned average rewards: left ${score(results[0])} / right ${score(results[1])}`),
    readout: lastAction === null
      ? t('ยังไม่ได้ลองทางไหน ลองทั้งสองทาง แล้วให้หุ่นยนต์เลือกดู', 'No paths tried yet. Try both, then let the robot choose.')
      : t(`ครั้งล่าสุด: ทาง${lastAction === 0 ? 'ซ้าย +1' : 'ขวา −1'} · ลองซ้าย ${results[0].count} ครั้ง ขวา ${results[1].count} ครั้ง`, `Last try: ${lastAction === 0 ? 'left +1' : 'right −1'} · Left tried ${count(results[0].count, 'time')}, right ${count(results[1].count, 'time')}.`),
  }
}
