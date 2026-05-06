const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

const MODULE_META = {
  jobs: {
    id: 'module-jobs',
    key: 'jobs',
    title: '在招岗位',
    subtitle: '查看当前正在招聘的岗位',
    summary: '可浏览退役军人友好岗位并加入关注列表。',
    actionText: '查看岗位',
    accent: 'red'
  },
  events: {
    id: 'module-events',
    key: 'events',
    title: '招聘活动',
    subtitle: '关注招聘会与直播带岗',
    summary: '支持查看招聘活动时间段、平台信息与关注状态。',
    actionText: '查看活动',
    accent: 'orange'
  },
  resume: {
    id: 'module-resume',
    key: 'resume',
    title: '个人简历',
    subtitle: '持续完善个人求职画像',
    summary: '整理服役经历、技能证书和岗位意向，便于后续应聘。',
    actionText: '完善简历',
    accent: 'blue'
  },
  applications: {
    id: 'module-applications',
    key: 'applications',
    title: '关注的岗位',
    subtitle: '集中查看已关注岗位',
    summary: '岗位更新后可以随时回来继续查看和联系企业。',
    actionText: '查看关注',
    accent: 'green'
  }
}

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const buildIdMap = (list, idKey = '_id') => {
  return normalizeArray(list).reduce((accumulator, item) => {
    const id = item && item[idKey]
    if (id) {
      accumulator[id] = item
    }
    return accumulator
  }, {})
}

const getUserProfile = async (userId) => {
  const userProfileRes = await db.collection('employment_profiles').where({ userId }).limit(1).get()

  if (userProfileRes.data && userProfileRes.data.length) {
    return userProfileRes.data[0]
  }

  return null
}

const getUserApplications = async (userId) => {
  const userRes = await db.collection('employment_applications').where({ userId }).orderBy('updatedAt', 'desc').limit(10).get()
  return userRes.data || []
}

const getUserFavorites = async (userId, targetType) => {
  const userRes = await db.collection('employment_favorites').where({ userId, targetType }).orderBy('updatedAt', 'desc').limit(50).get()
  return userRes.data || []
}

const getListByIds = async (collectionName, ids) => {
  if (!ids.length) {
    return []
  }

  const res = await db.collection(collectionName).where({
    _id: _.in(ids)
  }).get()

  return res.data || []
}

const isEventEnded = (eventItem) => {
  const endTime = new Date(eventItem && eventItem.endAt ? eventItem.endAt.replace(/-/g, '/') : '')
  if (Number.isNaN(endTime.getTime())) {
    return false
  }

  return endTime.getTime() < Date.now()
}

const decorateEvents = (eventList, favoriteIds) => {
  return normalizeArray(eventList)
    .map((eventItem) => {
      const eventId = eventItem && eventItem._id
      const isFollowed = !!(eventId && favoriteIds.has(eventId))
      const ended = isEventEnded(eventItem)

      return {
        ...eventItem,
        isFollowed,
        displayStatus: ended ? '已结束' : (isFollowed ? '已关注' : '关注'),
      }
    })
    .sort((prev, next) => {
      const prevEnded = prev.displayStatus === '已结束'
      const nextEnded = next.displayStatus === '已结束'

      if (prevEnded !== nextEnded) {
        return prevEnded ? 1 : -1
      }

      return new Date(prev.startAt.replace(/-/g, '/')).getTime() - new Date(next.startAt.replace(/-/g, '/')).getTime()
    })
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const [
      recommendedJobsRes,
      latestJobsRes,
      jobsCountRes,
      recommendedCountRes,
      eventsRes,
      eventsCountRes,
      profile,
      applications,
      favoriteJobs,
      favoriteEvents,
    ] = await Promise.all([
      db.collection('employment_jobs').where({ isActive: true, isRecommended: true }).orderBy('updatedAt', 'desc').limit(6).get(),
      db.collection('employment_jobs').where({ isActive: true }).orderBy('updatedAt', 'desc').limit(6).get(),
      db.collection('employment_jobs').where({ isActive: true }).count(),
      db.collection('employment_jobs').where({ isActive: true, isRecommended: true }).count(),
      db.collection('employment_events').limit(20).get(),
      db.collection('employment_events').count(),
      getUserProfile(OPENID),
      getUserApplications(OPENID),
      getUserFavorites(OPENID, 'job'),
      getUserFavorites(OPENID, 'event'),
    ])

    const recommendedJobs = normalizeArray(recommendedJobsRes.data)
    const latestJobs = normalizeArray(latestJobsRes.data)
    const allEvents = normalizeArray(eventsRes.data)
    const applicationList = normalizeArray(applications)

    const favoriteJobIds = normalizeArray(favoriteJobs).map((item) => item.targetId).filter(Boolean)
    const favoriteEventIds = normalizeArray(favoriteEvents).map((item) => item.targetId).filter(Boolean)
    const favoriteJobSet = new Set(favoriteJobIds)
    const favoriteEventSet = new Set(favoriteEventIds)

    const [followedJobsRaw, followedEventsRaw] = await Promise.all([
      getListByIds('employment_jobs', favoriteJobIds),
      getListByIds('employment_events', favoriteEventIds),
    ])

    const followedJobMap = buildIdMap(followedJobsRaw)
    const followedJobs = favoriteJobIds
      .map((jobId) => followedJobMap[jobId])
      .filter(Boolean)
      .map((item) => ({ ...item, isFollowed: true }))

    const followedEventMap = buildIdMap(followedEventsRaw)
    const followedEvents = decorateEvents(
      favoriteEventIds.map((eventId) => followedEventMap[eventId]).filter(Boolean),
      favoriteEventSet
    )

    const previewEvents = decorateEvents(allEvents, favoriteEventSet).slice(0, 4)
    const decoratedRecommendedJobs = (recommendedJobs.length ? recommendedJobs : latestJobs).map((item) => ({
      ...item,
      isFollowed: favoriteJobSet.has(item._id),
    }))

    const activeEventsCount = decorateEvents(allEvents, favoriteEventSet)
      .filter((item) => item.displayStatus !== '已结束').length

    const modules = [
      {
        ...MODULE_META.jobs,
        metrics: [
          { label: '在招岗位', value: `${jobsCountRes.total || 0}` },
          { label: '推荐岗位', value: `${recommendedCountRes.total || 0}` },
        ]
      },
      {
        ...MODULE_META.events,
        metrics: [
          { label: '近期活动', value: `${eventsCountRes.total || 0}` },
          { label: '未结束', value: `${activeEventsCount}` },
        ]
      },
      {
        ...MODULE_META.resume,
        metrics: [
          { label: '完整度', value: `${profile && profile.completeness ? profile.completeness : 0}%` },
          { label: '亮点标签', value: `${profile && Array.isArray(profile.highlights) ? profile.highlights.length : 0}项` },
        ]
      },
      {
        ...MODULE_META.applications,
        metrics: [
          { label: '关注岗位', value: `${followedJobs.length}` },
          { label: '关注活动', value: `${followedEvents.length}` },
        ]
      }
    ]

    return {
      success: true,
      data: {
        modules,
        recommendedJobs: decoratedRecommendedJobs,
        recruitmentEvents: previewEvents,
        resumeProfile: profile,
        applicationProgressList: applicationList,
        followedJobs,
        followedEvents,
      }
    }
  } catch (error) {
    console.error('获取就业服务数据失败', error)
    return {
      success: false,
      message: '获取就业服务数据失败',
      error,
    }
  }
}
