import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import config from '../config.json'

puppeteer.use(StealthPlugin())
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: config.captchaToken // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
)

export function puppeteerStart() {
  return puppeteer.launch({
    headless: false,
    executablePath: config.executablePath,
    userDataDir: config.userDataDir,
  })
}