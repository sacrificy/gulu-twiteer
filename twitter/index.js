import needle from 'needle'
import config from '../config.json';
import { FileBox } from 'file-box'

const token = config.token;
const roomList = config.roomList;
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=created_at&expansions=author_id';

// 推文监控
export function streamConnect(retryAttempt, puppet, browser) {
  console.log('推文监控启动')
  const stream = needle.get(streamURL, {
    headers: {
      "User-Agent": "v2FilterStreamJS",
      "Authorization": `Bearer ${token}`
    },
    timeout: 20000
  });

  stream.on('data', data => {
    try {
      const json = JSON.parse(data);
      console.log(json);
      // A successful connection resets retry count.
      sentTwitter(json, puppet, browser)
      retryAttempt = 0;
    } catch (e) {
      if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
        console.log(data)
        process.exit(1)
      } else {
        // Keep alive signal received. Do nothing.
        // console.log(e)
      }
    }
  }).on('err', error => {
    if (error.code !== 'ECONNRESET') {
      console.log(error.code);
      process.exit(1);
    } else {
      // This reconnection logic will attempt to reconnect when a disconnection is detected.
      // To avoid rate limits, this logic implements exponential backoff, so the wait time
      // will increase if the client cannot reconnect to the stream. 
      setTimeout(() => {
        console.warn("A connection error occurred. Reconnecting...")
        streamConnect(++retryAttempt);
      }, 2 ** retryAttempt)
    }
  });

  return stream;
}

// 查询规则
export async function getAllRules() {
  const response = await needle('get', rulesURL, {
    headers: {
      "authorization": `Bearer ${token}`
    }
  })

  if (response.statusCode !== 200) {
    console.log("Error:", response.statusMessage, response.statusCode)
    throw new Error(response.body);
  }

  return (response.body);
}

// 设置规则
export async function setRules(ruleList, curRuleTag) {
  const request = {
    "add": [
      {
        "value": ruleList.map(item => `from:${item}`).join(' OR '),
        "tag": curRuleTag
      }
    ]
  }

  const response = await needle('post', rulesURL, request, {
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`
    }
  })

  if (response.statusCode !== 201) {
    throw new Error(response.body);
  }

  return (response.body);

}

// 删除规则
export async function deleteRules(id) {
  const data = {
    "delete": {
      "ids": [id]
    }
  }

  const response = await needle('post', rulesURL, data, {
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`
    }
  })

  if (response.statusCode !== 200) {
    throw new Error(response.body);
  }
  return (response.body);
}



async function sentTwitter(json, puppet, browser) {
  const sentText = (id, text) => puppet.messageSendText(id, text)
  const sentFIle = (id, fileBox) => puppet.messageSendFile(id, fileBox)
  // 格式化数据
  const {
    data: twitterData,
    includes: { users },
    matching_rules
  } = json;
  const rulesList = matching_rules.map((item) => item.tag)
  const curRoom = roomList.filter((item) => { return rulesList.includes(item.ruleTag) });
  let sentIdList = [dev];
  if (curRoom.length > 0) {
    sentIdList = curRoom.map((item) => item.groupID);
  }
  console.log(sentIdList)
  const {
    created_at,
    id,
    text
  } = twitterData;
  const {
    name,
    username
  } = users[0];
  for (let sentId of sentIdList) {
    console.log(sentId)
    // await sentText(sentId, `${name}(${username})`)
    // await sentText(sentId, text)
    // await sentText(sentId, text.replaceAll(/[^\w\s]/g, ''))
    const twitterLink = `https://twitter.com/${username}/status/${id}`
    await sentText(sentId, twitterLink)
    const fileBox = await getTwitterPic(twitterLink, browser)
    await sentFIle(sentId, fileBox)
  }
}

async function getTwitterPic(link, browser) {
  const page = await browser.newPage()
  await page.goto(link)
  await page.waitFor('div>article')
  const article = await page.$('div>article')
  const buffer = await article.screenshot()
  const fileBox = FileBox.fromBuffer(buffer)
  return fileBox
}