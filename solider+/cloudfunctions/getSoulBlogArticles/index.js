const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()
const _ = db.command

const normalizeString = (value) => `${value || ''}`.trim()
const normalizeUrlValue = (value) => `${value || ''}`.replace(/&amp;/gi, '&').trim()

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

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

const normalizePositiveInt = (value, defaultValue, maxValue) => {
  const parsed = parseInt(value, 10)

  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue
  }

  return Math.min(parsed, maxValue)
}

const escapeRegExp = (value) => {
  return `${value || ''}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const buildCondition = (userId, payload) => {
  const conditions = [
    { userId },
    { status: 'published' },
  ]

  if (payload.categoryId) {
    conditions.push({ categoryId: payload.categoryId })
  }

  if (payload.keyword) {
    const keywordRegExp = db.RegExp({
      regexp: escapeRegExp(payload.keyword),
      options: 'i',
    })

    conditions.push(_.or([
      { title: keywordRegExp },
      { categoryName: keywordRegExp },
      { summary: keywordRegExp },
      { plainText: keywordRegExp },
    ]))
  }

  return conditions.length === 1 ? conditions[0] : _.and(conditions)
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const payload = {
    page: normalizePositiveInt(event.page, 1, 1000),
    pageSize: normalizePositiveInt(event.pageSize, 10, 50),
    keyword: normalizeString(event.keyword),
    categoryId: normalizeString(event.categoryId),
  }
  const condition = buildCondition(OPENID, payload)
  const skip = (payload.page - 1) * payload.pageSize

  try {
    const [countRes, listRes] = await Promise.all([
      db.collection('user_blog_articles').where(condition).count(),
      db.collection('user_blog_articles')
        .where(condition)
        .orderBy('updatedAt', 'desc')
        .skip(skip)
        .limit(payload.pageSize)
        .get(),
    ])

    const total = countRes.total || 0
    const list = await resolveArticlesForDisplay(listRes.data)

    return {
      success: true,
      data: {
        list,
        pagination: {
          page: payload.page,
          pageSize: payload.pageSize,
          total,
          hasMore: skip + list.length < total,
        },
        filters: {
          keyword: payload.keyword,
          categoryId: payload.categoryId,
        },
      }
    }
  } catch (error) {
    console.error('获取军魂记录文章列表失败', error)
    return {
      success: false,
      message: '获取军魂记录文章列表失败',
      error,
    }
  }
}
