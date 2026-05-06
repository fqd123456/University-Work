const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const TEMPLATE_USER_ID = '__template__'
const DEFAULT_DISPLAY_NAME = '退役军人'
const DEFAULT_MOTTO = '把走过的路，写成照亮后来人的光。'

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

const normalizeUrlValue = (value) => `${value || ''}`.replace(/&amp;/gi, '&').trim()

const uniqueStringArray = (value) => {
  return Array.from(new Set(
    normalizeArray(value)
      .map((item) => normalizeUrlValue(item))
      .filter(Boolean)
  ))
}

const isCloudFileId = (value) => /^cloud:\/\//i.test(normalizeUrlValue(value))

const createTempUrlMap = async (fileList) => {
  const normalizedList = uniqueStringArray(fileList)
  const fileMap = {}
  const cloudFileList = normalizedList.filter((item) => isCloudFileId(item))

  normalizedList
    .filter((item) => !isCloudFileId(item))
    .forEach((item) => {
      fileMap[item] = item
    })

  if (!cloudFileList.length) {
    return fileMap
  }

  const res = await cloud.getTempFileURL({
    fileList: cloudFileList,
  }).catch(() => ({ fileList: [] }))

  normalizeArray(res.fileList).forEach((item) => {
    const fileID = normalizeUrlValue(item.fileID)
    const tempFileURL = normalizeUrlValue(item.tempFileURL)

    if (fileID) {
      fileMap[fileID] = tempFileURL || fileID
    }
  })

  return fileMap
}

const resolveAssetUrl = (value, fileMap) => {
  const normalized = normalizeUrlValue(value)

  if (!normalized) {
    return ''
  }

  return fileMap[normalized] || normalized
}

const getArticleCoverSource = (article) => {
  if (!article) {
    return ''
  }

  const imageList = normalizeArray(article.imageList)
  const firstImage = normalizeUrlValue(imageList[0] || '')

  if (isCloudFileId(firstImage)) {
    return firstImage
  }

  return normalizeUrlValue(article.coverImage || firstImage)
}

const resolveArticlesForDisplay = async (articles) => {
  const coverSourceList = uniqueStringArray(
    normalizeArray(articles).map((item) => getArticleCoverSource(item))
  )
  const fileMap = await createTempUrlMap(coverSourceList)

  return normalizeArray(articles).map((item) => {
    const coverImage = resolveAssetUrl(getArticleCoverSource(item), fileMap)

    return {
      ...item,
      coverImage,
    }
  })
}

const getDateText = (value) => `${value || ''}`.trim().slice(0, 10)

const formatNow = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const getTemplateProfile = async () => {
  const res = await db.collection('user_blog_profiles').where({ userId: TEMPLATE_USER_ID }).limit(1).get()
  return res.data && res.data.length ? res.data[0] : null
}

const getTemplateCategories = async () => {
  const res = await db.collection('user_blog_categories')
    .where({ userId: TEMPLATE_USER_ID })
    .orderBy('sortOrder', 'asc')
    .limit(20)
    .get()

  return normalizeArray(res.data)
}

const getUserDoc = async (userId) => {
  const res = await db.collection('users').doc(userId).get().catch(() => ({ data: null }))
  return res && res.data ? res.data : null
}

const ensureUserProfile = async (userId) => {
  const profileRes = await db.collection('user_blog_profiles').where({ userId }).limit(1).get()

  if (profileRes.data && profileRes.data.length) {
    return profileRes.data[0]
  }

  const now = formatNow()
  const [templateProfile, userDoc] = await Promise.all([
    getTemplateProfile(),
    getUserDoc(userId),
  ])

  const nextProfile = {
    userId,
    displayName: userDoc && (userDoc.nickname || userDoc.real_name)
      ? (userDoc.nickname || userDoc.real_name)
      : templateProfile && templateProfile.displayName
        ? templateProfile.displayName
        : DEFAULT_DISPLAY_NAME,
    avatarUrl: userDoc && userDoc.avatar
      ? userDoc.avatar
      : templateProfile && templateProfile.avatarUrl
        ? templateProfile.avatarUrl
        : '',
    motto: templateProfile && templateProfile.motto ? templateProfile.motto : DEFAULT_MOTTO,
    createdAt: now,
    updatedAt: now,
  }

  const addRes = await db.collection('user_blog_profiles').add({
    data: nextProfile
  })

  return {
    _id: addRes._id,
    ...nextProfile,
  }
}

const ensureUserCategories = async (userId) => {
  const categoriesRes = await db.collection('user_blog_categories')
    .where({ userId })
    .orderBy('sortOrder', 'asc')
    .limit(50)
    .get()

  if (categoriesRes.data && categoriesRes.data.length) {
    return categoriesRes.data
  }

  const now = formatNow()
  const templateCategories = await getTemplateCategories()
  const fallbackCategories = templateCategories.length
    ? templateCategories
    : [
      { name: '生活', sortOrder: 1, isDefault: true },
      { name: '运动', sortOrder: 2, isDefault: true },
    ]

  const createdCategories = await Promise.all(
    fallbackCategories.map((item, index) => {
      const categoryData = {
        userId,
        name: item && item.name ? item.name : `分类 ${index + 1}`,
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index + 1,
        articleCount: typeof item.articleCount === 'number' ? item.articleCount : 0,
        isDefault: item && item.isDefault === true,
        createdAt: now,
        updatedAt: now,
      }

      return db.collection('user_blog_categories').add({
        data: categoryData
      }).then((res) => ({
        _id: res._id,
        ...categoryData,
      }))
    })
  )

  return createdCategories
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const [profile, categories, articlesRes, countRes, writingArticlesRes] = await Promise.all([
      ensureUserProfile(OPENID),
      ensureUserCategories(OPENID),
      db.collection('user_blog_articles')
        .where({
          userId: OPENID,
          status: 'published',
        })
        .orderBy('updatedAt', 'desc')
        .limit(20)
        .get(),
      db.collection('user_blog_articles')
        .where({
          userId: OPENID,
          status: 'published',
        })
        .count(),
      db.collection('user_blog_articles')
        .where({
          userId: OPENID,
          status: 'published',
        })
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get(),
    ])

    const recentArticles = await resolveArticlesForDisplay(articlesRes.data)
    const totalWords = recentArticles.reduce((total, item) => {
      const plainText = item && item.plainText ? `${item.plainText}` : ''
      return total + plainText.length
    }, 0)
    const writingDays = Array.from(new Set(
      normalizeArray(writingArticlesRes.data)
        .map((item) => getDateText(item && (item.updatedAt || item.publishedAt || item.createdAt)))
        .filter(Boolean)
    )).length

    return {
      success: true,
      data: {
        profile,
        categories,
        recentArticles,
        stats: {
          articleCount: countRes.total || 0,
          categoryCount: categories.length,
          totalWords,
          writingDays,
        },
      }
    }
  } catch (error) {
    console.error('获取军魂记录首页数据失败', error)
    return {
      success: false,
      message: '获取军魂记录首页数据失败',
      error,
    }
  }
}
