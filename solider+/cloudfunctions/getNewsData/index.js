const cloud = require('wx-server-sdk')
const http = require('http')
const https = require('https')
const zlib = require('zlib')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const GOV_NEWS_URL = 'https://www.gov.cn/pushinfo/v150203/pushinfo.json'
const REQUEST_TIMEOUT = 15000
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 12

const POLICY_KEYWORDS = [
  '政策',
  '意见',
  '解读',
  '通知',
  '办法',
  '条例',
  '决定',
  '方案',
  '措施',
  '规则',
  '批复',
  '问答',
  '图解',
  '实施',
  '细则',
  '指南'
]

const LOCAL_KEYWORDS = [
  '地方',
  '基层',
  '社区',
  '省',
  '市',
  '区',
  '县',
  '自治区',
  '新区',
  '试点',
  '示范',
  '四川',
  '北京',
  '上海',
  '天津',
  '重庆',
  '广东',
  '江苏',
  '浙江',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '福建',
  '江西',
  '河北',
  '山西',
  '陕西',
  '辽宁',
  '吉林',
  '黑龙江',
  '安徽',
  '海南',
  '云南',
  '贵州',
  '甘肃',
  '青海',
  '宁夏',
  '广西',
  '西藏',
  '新疆',
  '内蒙古'
]

const MEDIA_KEYWORDS = [
  '报道',
  '观察',
  '访谈',
  '评论',
  '记者',
  '新华社',
  '人民日报',
  '央视',
  '中国日报',
  '经济日报',
  '答记者问',
  '权威访谈'
]

const decodeHtml = (value) => {
  return `${value || ''}`
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ensp;/gi, ' ')
    .replace(/&emsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#12288;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

const cleanText = (value) => {
  return decodeHtml(`${value || ''}`)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u3000/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

const normalizeUrl = (value, baseUrl) => {
  const raw = `${value || ''}`.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.indexOf('//') === 0) return `https:${raw}`
  if (!baseUrl) return raw

  try {
    return new URL(raw, baseUrl).toString()
  } catch (err) {
    return raw
  }
}

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch (err) {
    return fallback
  }
}

const hashText = (value) => {
  let hash = 0
  const text = `${value || ''}`
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

const extractArticleId = (url) => {
  const match = `${url || ''}`.match(/content_(\d+)\.htm/i)
  return match ? match[1] : hashText(url)
}

const normalizeTime = (value) => {
  const raw = `${value || ''}`.trim()
  if (!raw) return ''
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[- ](\d{2}:\d{2}:\d{2})$/)
  if (match) {
    return `${match[1]} ${match[2].slice(0, 5)}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw} 00:00`
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
    return raw.slice(0, 16)
  }
  return raw
}

const extractMeta = (html, name) => {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=(["'])([\\s\\S]*?)\\1[^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=(["'])([\\s\\S]*?)\\1[^>]+name=["']${name}["'][^>]*>`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[2]) {
      return cleanText(match[2])
    }
  }

  return ''
}

const uniqueTexts = (items) => {
  const seen = new Set()
  const result = []

  items.forEach((item) => {
    const text = cleanText(item)
    if (!text || seen.has(text)) return
    seen.add(text)
    result.push(text)
  })

  return result
}

const requestText = (url, redirectCount = 0) => {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) {
      reject(new Error('too many redirects'))
      return
    }

    const client = /^https:\/\//i.test(url) ? https : http
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json,text/html,*/*',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    }, (res) => {
      const statusCode = res.statusCode || 500

      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        const nextUrl = normalizeUrl(res.headers.location, url)
        res.resume()
        requestText(nextUrl, redirectCount + 1).then(resolve).catch(reject)
        return
      }

      let stream = res
      const encoding = `${res.headers['content-encoding'] || ''}`.toLowerCase()
      if (encoding.indexOf('gzip') > -1) {
        stream = res.pipe(zlib.createGunzip())
      } else if (encoding.indexOf('deflate') > -1) {
        stream = res.pipe(zlib.createInflate())
      } else if (encoding.indexOf('br') > -1 && typeof zlib.createBrotliDecompress === 'function') {
        stream = res.pipe(zlib.createBrotliDecompress())
      }

      const chunks = []
      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      stream.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        if (statusCode >= 400) {
          reject(new Error(`request failed: ${statusCode}`))
          return
        }
        resolve(text)
      })
      stream.on('error', reject)
    })

    req.setTimeout(REQUEST_TIMEOUT, () => {
      req.destroy(new Error('request timeout'))
    })
    req.on('error', reject)
  })
}

const normalizeRawNews = (item) => {
  const title = cleanText(item && item.title)
  const description = cleanText(item && item.description)
  const url = normalizeUrl(item && item.link, 'https://www.gov.cn/')
  const source = cleanText(item && item.author) || '中国政府网'
  const time = normalizeTime(item && item.pubDate)

  return {
    title,
    description,
    url,
    source,
    time,
    searchText: `${title} ${description}`
  }
}

const hasKeyword = (text, keywords) => {
  return keywords.some(keyword => text.indexOf(keyword) > -1)
}

const buildContent = (item) => {
  const content = []

  if (item.description) {
    content.push(item.description)
  }

  content.push(`来源：${item.source}`)

  if (item.url) {
    content.push(`原文链接：${item.url}`)
  }

  return uniqueTexts(content)
}

const buildNewsItem = (tab, item, index) => {
  const articleId = extractArticleId(item.url || `${tab}-${index + 1}`)

  return {
    id: `${tab}-${articleId}-${index + 1}`,
    tab,
    title: item.title,
    time: item.time,
    source: item.source,
    content: buildContent(item),
    url: item.url,
  }
}

const pickTabItems = (tab, candidates, fallbackPool, limit) => {
  const picked = []
  const seen = new Set()

  const addItem = (item) => {
    const key = `${item.url || ''}::${item.title || ''}`
    if (!item.title || seen.has(key) || picked.length >= limit) return
    seen.add(key)
    picked.push(buildNewsItem(tab, item, picked.length))
  }

  candidates.forEach(addItem)
  fallbackPool.forEach(addItem)

  return picked
}

const buildNewsList = (rawList, limit) => {
  const normalized = rawList
    .map(normalizeRawNews)
    .filter(item => item.title && item.url)

  const policyItems = normalized.filter(item => {
    return item.url.indexOf('/zhengce/') > -1 || hasKeyword(item.searchText, POLICY_KEYWORDS)
  })
  const localItems = normalized.filter(item => hasKeyword(item.searchText, LOCAL_KEYWORDS))
  const mediaItems = normalized.filter(item => hasKeyword(item.searchText, MEDIA_KEYWORDS))

  return [
    ...pickTabItems('info', normalized, normalized, limit),
    ...pickTabItems('media', mediaItems, normalized, limit),
    ...pickTabItems('policy', policyItems, normalized, limit),
    ...pickTabItems('local', localItems, normalized, limit),
  ]
}

const fetchNewsList = async (limit) => {
  const rawText = await requestText(GOV_NEWS_URL)
  const rawList = parseJson(rawText, [])

  if (!Array.isArray(rawList)) {
    throw new Error('news api data invalid')
  }

  return buildNewsList(rawList, limit)
}

const fetchNewsDetail = async (url) => {
  const html = await requestText(url)
  const title = cleanText((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '')
    .replace(/_[^_]+_中国政府网$/, '')
    .replace(/__中国政府网$/, '')
  const publishedTime = normalizeTime(extractMeta(html, 'firstpublishedtime') || extractMeta(html, 'lastmodifiedtime'))
  const description = extractMeta(html, 'description')
  const pagesContent = html.match(/<div class="pages_content"[^>]*>([\s\S]*?)<\/div>/i)

  let paragraphs = []
  if (pagesContent && pagesContent[1]) {
    const matches = pagesContent[1].match(/<p[\s\S]*?<\/p>/gi) || []
    paragraphs = matches.map(cleanText).filter(Boolean)
  }

  if (!paragraphs.length && description) {
    paragraphs = [description]
  }

  return {
    title,
    time: publishedTime,
    content: uniqueTexts(paragraphs).slice(0, 40),
  }
}

exports.main = async (event) => {
  const action = event && event.action ? event.action : 'list'
  const limit = Math.min(Math.max(Number(event && event.limit) || DEFAULT_LIMIT, 4), MAX_LIMIT)

  try {
    if (action === 'detail') {
      const url = normalizeUrl(event && event.url, 'https://www.gov.cn/')
      if (!url) {
        return { success: false, message: '缺少文章地址' }
      }

      const detail = await fetchNewsDetail(url)
      return {
        success: true,
        data: detail,
      }
    }

    const list = await fetchNewsList(limit)
    return {
      success: true,
      data: list,
      fetchedAt: Date.now(),
    }
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : '新闻获取失败',
    }
  }
}
