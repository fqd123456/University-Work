const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const formatDate = (value) => `${value || ''}`.trim().slice(0, 10)

const getDateLabel = (value) => {
  const normalized = formatDate(value)
  if (!normalized) {
    return ''
  }

  const [year, month, day] = normalized.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

const addMonths = (dateString, months) => {
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  date.setMonth(date.getMonth() + months)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const diffDays = (start, end) => {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return Number.MAX_SAFE_INTEGER
  }

  return Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
}

const normalizeLogs = (logs) => {
  const dateSet = new Set()
  return (Array.isArray(logs) ? logs : [])
    .map((item) => ({
      ...item,
      recordedDate: formatDate(item && item.recordedAt),
    }))
    .filter((item) => item.recordedDate)
    .sort((left, right) => `${left.recordedDate}`.localeCompare(`${right.recordedDate}`))
    .filter((item) => {
      if (dateSet.has(item.recordedDate)) {
        return false
      }
      dateSet.add(item.recordedDate)
      return true
    })
}

const getConsecutiveMonthAchievementDate = (logs, monthTarget) => {
  if (!logs.length) {
    return ''
  }

  for (let startIndex = 0; startIndex < logs.length; startIndex += 1) {
    const startDate = logs[startIndex].recordedDate
    const targetDate = addMonths(startDate, monthTarget)

    if (!targetDate) {
      continue
    }

    const matchedLog = logs.find((item) => diffDays(item.recordedDate, targetDate) >= 0 && diffDays(item.recordedDate, targetDate) <= 31)

    if (matchedLog) {
      return matchedLog.recordedDate
    }
  }

  return ''
}

const medalDefinitions = [
  {
    id: 'health_first_record',
    category: 'health',
    name: '启航步勋章',
    icon: '启',
    description: '完成第一次身体记录，迈出健康管理第一步。',
    condition: '首次记录身高体重或体重日志即可获得',
  },
  {
    id: 'health_one_month',
    category: 'health',
    name: '坚守月勋章',
    icon: '月',
    description: '连续一个月坚持记录身体数据，保持自律节奏。',
    condition: '从第一次记录起，连续一个月内保持记录',
  },
  {
    id: 'health_three_month',
    category: 'health',
    name: '长锋勋章',
    icon: '锋',
    description: '连续三个月坚持记录，形成稳定健康习惯。',
    condition: '从第一次记录起，连续三个月保持记录',
  },
  {
    id: 'blog_first_article',
    category: 'blog',
    name: '初火勋章',
    icon: '火',
    description: '发布第一篇军魂记录，让故事第一次被看见。',
    condition: '发布第一篇文章即可获得',
  },
  {
    id: 'blog_five_articles',
    category: 'blog',
    name: '烽文勋章',
    icon: '文',
    description: '累计发布五篇文章，持续记录成长与生活。',
    condition: '累计发布 5 篇文章即可获得',
  },
  {
    id: 'blog_ten_articles',
    category: 'blog',
    name: '荣光著勋章',
    icon: '著',
    description: '累计发布十篇文章，沉淀出属于自己的军魂档案。',
    condition: '累计发布 10 篇文章即可获得',
  },
]

const buildMedals = ({ healthLogs, articleList }) => {
  const normalizedHealthLogs = normalizeLogs(healthLogs)
  const normalizedArticles = (Array.isArray(articleList) ? articleList : [])
    .map((item) => ({
      ...item,
      publishedDate: formatDate(item && (item.publishedAt || item.createdAt || item.updatedAt)),
    }))
    .sort((left, right) => `${left.publishedDate}`.localeCompare(`${right.publishedDate}`))

  const healthFirstDate = normalizedHealthLogs.length ? normalizedHealthLogs[0].recordedDate : ''
  const healthOneMonthDate = getConsecutiveMonthAchievementDate(normalizedHealthLogs, 1)
  const healthThreeMonthDate = getConsecutiveMonthAchievementDate(normalizedHealthLogs, 3)
  const articleFirstDate = normalizedArticles[0] ? normalizedArticles[0].publishedDate : ''
  const articleFiveDate = normalizedArticles[4] ? normalizedArticles[4].publishedDate : ''
  const articleTenDate = normalizedArticles[9] ? normalizedArticles[9].publishedDate : ''

  const achievedMap = {
    health_first_record: healthFirstDate,
    health_one_month: healthOneMonthDate,
    health_three_month: healthThreeMonthDate,
    blog_first_article: articleFirstDate,
    blog_five_articles: articleFiveDate,
    blog_ten_articles: articleTenDate,
  }

  const medals = medalDefinitions.map((item) => {
    const achievedAt = achievedMap[item.id] || ''
    return {
      ...item,
      achieved: !!achievedAt,
      achievedAt,
      achievedAtLabel: achievedAt ? getDateLabel(achievedAt) : '',
    }
  })

  const achievedMedals = medals.filter((item) => item.achieved)
  const latestAchievedMedal = [...achievedMedals]
    .sort((left, right) => `${right.achievedAt}`.localeCompare(`${left.achievedAt}`))[0] || null

  return {
    medals,
    summary: {
      totalCount: medals.length,
      achievedCount: achievedMedals.length,
      latestAchievedMedalName: latestAchievedMedal ? latestAchievedMedal.name : '',
      latestAchievedAt: latestAchievedMedal ? latestAchievedMedal.achievedAt : '',
      healthAchievedCount: achievedMedals.filter((item) => item.category === 'health').length,
      blogAchievedCount: achievedMedals.filter((item) => item.category === 'blog').length,
      healthLogCount: normalizedHealthLogs.length,
      articleCount: normalizedArticles.length,
    },
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const [healthLogsRes, articleRes] = await Promise.all([
      db.collection('user_health_logs')
        .where({ userId: OPENID })
        .orderBy('recordedAt', 'asc')
        .limit(200)
        .get(),
      db.collection('user_blog_articles')
        .where({
          userId: OPENID,
          status: 'published',
        })
        .orderBy('publishedAt', 'asc')
        .limit(200)
        .get(),
    ])

    const result = buildMedals({
      healthLogs: healthLogsRes.data || [],
      articleList: articleRes.data || [],
    })

    return {
      success: true,
      data: {
        categories: [
          {
            key: 'health',
            title: '身体记录勋章',
            subtitle: '坚持记录每一次身体变化，勋章会随之点亮。',
            medals: result.medals.filter((item) => item.category === 'health'),
          },
          {
            key: 'blog',
            title: '军魂记录勋章',
            subtitle: '用文字留下军旅印记，持续发文即可获得勋章。',
            medals: result.medals.filter((item) => item.category === 'blog'),
          },
        ],
        summary: result.summary,
      },
    }
  } catch (error) {
    console.error('获取用户勋章数据失败', error)
    return {
      success: false,
      message: '获取用户勋章数据失败',
      error,
    }
  }
}
