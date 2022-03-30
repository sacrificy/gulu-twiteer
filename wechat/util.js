export function parseRule(currentRules, curRuleTag) {
  const { data } = currentRules;
  const discordRule = data.find(item => item.tag === curRuleTag) || {};
  const {
    value = '',
    id
  } = discordRule
  const ruleList = value.replaceAll('from:', '').split(' OR ')
  return {
    id,
    ruleList
  }
}

export function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}