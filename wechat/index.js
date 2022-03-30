import { PuppetXp } from 'wechaty-puppet-xp'
import qrcodeTerminal from 'qrcode-terminal'
import config from '../config.json'
import { parseRule, sleep } from './util'
import { getAllRules, setRules, deleteRules } from '../twitter/index'

const dev = config.dev
const roomList = config.roomList

export function wechatStart() {
  const puppet = new PuppetXp()

  puppet
    .on('logout', onLogout)
    .on('login', onLogin)
    .on('scan', onScan)
    .on('error', onError)
    .on('message', onMessage)

  puppet.start()
    .catch(async e => {
      console.error('Bot start() fail:', e)
      await puppet.stop()
      process.exit(-1)
    })

  function onScan(payload) {
    if (payload.qrcode) {
      const qrcodeImageUrl = [
        'https://wechaty.js.org/qrcode/',
        encodeURIComponent(payload.qrcode),
      ].join('')
      console.info('StarterBot', 'onScan: %s(%s) - %s', payload.status, qrcodeImageUrl)

      qrcodeTerminal.generate(payload.qrcode, { small: true })  // show qrcode on console
      console.info(`[${payload.status}] ${payload.qrcode}\nScan QR Code above to log in: `)
    } else {
      console.info(`[${payload.status}]`)
    }
  }

  function onLogin(payload) {
    console.info(`${payload.contactId} login`)
  }

  function onLogout(payload) {
    console.info(`${payload.contactId} logouted`)
  }

  function onError(payload) {
    console.error('Bot error:', payload.data)
  }
  // 发送文本消息
  function sentText(id, text) {
    console.log(id, text)
    return puppet.messageSendText(id, text)
  }

  async function onMessage({
    messageId,
  }) {
    const {
      fromId,
      roomId,
      text = '',
    } = await puppet.messagePayload(messageId)
    console.log(fromId, roomId, text)
    if (/ding/i.test(text || '')) {
      await puppet.messageSendText(roomId || fromId, 'dong')
    }
    // 判断来源
    const curRoom = roomList.find((item) => { return item.groupID === roomId }) || group[0];
    const curRuleTag = curRoom.ruleTag;
    try {
      // 命令识别
      if (/^\//.test(text)) {
        // 帮助
        if (/^\/help$/.test(text)) {
          await sentText(roomId || fromId, `/list 查看监控列表\n/add id1,id2 添加监控\n/delete id1,id2 删除监控\n/deleteall 删除全部监控`)
        }
        // 查看监控列表
        if (/^\/list$/.test(text)) {
          const currentRules = await getAllRules();
          const { ruleList } = parseRule(currentRules, curRuleTag)
          await sentText(roomId || fromId, ruleList.join('\n'))
        }
        // 添加
        if (/^\/add (.*)$/.test(text)) {
          const addStr = text.match(/\/add (.*)/)[1];
          const addList = addStr.split(',')
          const currentRules = await getAllRules();
          const { ruleList, id } = parseRule(currentRules, curRuleTag);
          const newRuleList = [...new Set([...ruleList, ...addList])] //去重
          if (id) {
            await deleteRules(id) //删除老规则
            await sleep(500)
          }
          await setRules(newRuleList, curRuleTag)
          await sentText(roomId || fromId, '添加成功')
        }
        // 删除
        if (/^\/delete (.*)$/.test(text)) {
          const deleteStr = text.match(/\/delete (.*)/)[1];
          const deleteList = deleteStr.split(',')
          const currentRules = await getAllRules();
          const { ruleList, id } = parseRule(currentRules, curRuleTag);
          const newRuleList = ruleList.filter(item => !deleteList.includes(item))
          if (id) {
            await deleteRules(id) //删除老规则
            await sleep(500)
          }
          await setRules(newRuleList, curRuleTag)
          await sentText(roomId || fromId, '删除成功')
        }
        // 删除全部
        if (/^\/deleteall$/.test(text)) {
          const currentRules = await getAllRules();
          const { ruleList, id } = parseRule(currentRules, curRuleTag);
          await deleteRules(id)
          await sentText(roomId || fromId, '删除全部成功')
        }
      }
    } catch (error) {
      console.log('命令处理失败', error)
      await sentText(roomId || fromId, '命令处理失败')
    }
  }
  return puppet
}
