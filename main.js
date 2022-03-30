import { streamConnect } from './twitter/index.js'
import { wechatStart } from './wechat/index.js'
import { puppeteerStart } from './puppeteer/index.js'

async function main() {
  // 启动微信
  const puppet = wechatStart()
  // 启动浏览器
  const browser = await puppeteerStart()
  // 启动推特监控
  streamConnect(0, puppet, browser);
}

main()