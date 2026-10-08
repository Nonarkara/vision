// A one-step reward learner (a two-armed bandit), not a navigation model.
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
