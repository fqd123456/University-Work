const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const normalizeString = (value) => `${value || ''}`.trim()
const normalizeUrlValue = (value) => `${value || ''}`.replace(/&amp;/gi, '&').trim()

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

const uniqueStringArray = (value) => {
  const list = normalizeArray(value)
    .map((item) => normalizeString(item))
    .filter(Boolean)

  return Array.from(new Set(list))
}

const formatNow = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const stripHtml = (html) => {
  return normalizeString(
    `${html || ''}`
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  )
}

const getSummary = (summary, plainText) => {
  const nextSummary = normalizeString(summary)

  if (nextSummary) {
    return nextSummary.slice(0, 120)
  }

  return plainText.slice(0, 90)
}

const isCloudFileId = (value) => /^cloud:\/\//i.test(normalizeUrlValue(value))

const extractCloudFilePath = (fileId) => {
  const match = normalizeUrlValue(fileId).match(/^cloud:\/\/[^/]+\/(.+)$/i)
  return match && match[1] ? match[1] : ''
}

const extractUrlPath = (value) => {
  const normalized = normalizeUrlValue(value)

  if (!/^https?:\/\//i.test(normalized)) {
    return ''
  }

  try {
    return new URL(normalized).pathname.replace(/^\/+/, '')
  } catch (error) {
    return ''
  }
}

const normalizeContentHtml = (html, imageList) => {
  const pathToFileIdMap = uniqueStringArray(imageList).reduce((result, item) => {
    if (!isCloudFileId(item)) {
      return result
    }

    const filePath = extractCloudFilePath(item)

    if (filePath) {
      result[filePath] = normalizeUrlValue(item)
    }

    return result
  }, {})

  return `${html || ''}`.replace(/(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/gi, (_, prefix, src, suffix) => {
    const normalizedSrc = normalizeUrlValue(src)

    if (isCloudFileId(normalizedSrc)) {
      return `${prefix}${normalizedSrc}${suffix}`
    }

    const matchedFileId = pathToFileIdMap[extractUrlPath(normalizedSrc)]
    return `${prefix}${matchedFileId || normalizedSrc}${suffix}`
  })
}

const getFirstImage = (html, imageList) => {
  const images = uniqueStringArray(imageList)

  if (images.length) {
    return normalizeUrlValue(images[0])
  }

  const match = `${html || ''}`.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match && match[1] ? normalizeUrlValue(match[1]) : ''
}

const getCategoryById = async (userId, categoryId) => {
  if (!categoryId) {
    return null
  }

  const res = await db.collection('user_blog_categories').doc(categoryId).get().catch(() => ({ data: null }))
  const category = res && res.data ? res.data : null

  if (!category || category.userId !== userId) {
    return null
  }

  return category
}

const ensureCategory = async (userId, categoryId, categoryName) => {
  const categoryFromId = await getCategoryById(userId, categoryId)

  if (categoryFromId) {
    return categoryFromId
  }

  const name = normalizeString(categoryName)

  if (!name) {
    return null
  }

  const existedRes = await db.collection('user_blog_categories')
    .where({
      userId,
      name,
    })
    .limit(1)
    .get()

  if (existedRes.data && existedRes.data.length) {
    return existedRes.data[0]
  }

  const countRes = await db.collection('user_blog_categories').where({ userId }).count()
  const now = formatNow()
  const categoryData = {
    userId,
    name,
    sortOrder: (countRes.total || 0) + 1,
    articleCount: 0,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  }

  const addRes = await db.collection('user_blog_categories').add({
    data: categoryData
  })

  return {
    _id: addRes._id,
    ...categoryData,
  }
}

const syncCategoryCount = async (userId, categoryId) => {
  if (!categoryId) {
    return
  }

  const [categoryRes, countRes] = await Promise.all([
    db.collection('user_blog_categories').doc(categoryId).get().catch(() => ({ data: null })),
    db.collection('user_blog_articles')
      .where({
        userId,
        categoryId,
        status: 'published',
      })
      .count(),
  ])

  const category = categoryRes && categoryRes.data ? categoryRes.data : null

  if (!category || category.userId !== userId) {
    return
  }

  await db.collection('user_blog_categories').doc(categoryId).update({
    data: {
      articleCount: countRes.total || 0,
      updatedAt: formatNow(),
    }
  })
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const articleId = normalizeString(event.articleId)
  const title = normalizeString(event.title)
  const imageList = uniqueStringArray(normalizeArray(event.imageList).map((item) => normalizeUrlValue(item)))
  const contentHtml = normalizeContentHtml(`${event.contentHtml || ''}`.trim(), imageList)
  const plainText = normalizeString(event.plainText) || stripHtml(contentHtml)
  const hasImageContent = /<img\b/i.test(contentHtml)
  const summary = getSummary(event.summary, plainText)
  const keywords = uniqueStringArray(event.keywords)

  if (!title) {
    return {
      success: false,
      message: '请输入文章标题'
    }
  }

  if (title.length > 40) {
    return {
      success: false,
      message: '标题不能超过 40 个字'
    }
  }

  if (!plainText && !hasImageContent) {
    return {
      success: false,
      message: '请输入文章内容'
    }
  }

  try {
    const category = await ensureCategory(
      OPENID,
      normalizeString(event.categoryId),
      normalizeString(event.categoryName)
    )

    if (!category) {
      return {
        success: false,
        message: '请选择文章分类'
      }
    }

    const now = formatNow()
    const nextArticleData = {
      userId: OPENID,
      title,
      categoryId: category._id,
      categoryName: category.name,
      summary,
      contentHtml,
      plainText,
      coverImage: getFirstImage(contentHtml, imageList),
      imageList,
      keywords: uniqueStringArray(keywords.concat([title, category.name])),
      status: 'published',
      updatedAt: now,
    }

    if (articleId) {
      const currentRes = await db.collection('user_blog_articles').doc(articleId).get().catch(() => ({ data: null }))
      const currentArticle = currentRes && currentRes.data ? currentRes.data : null

      if (!currentArticle || currentArticle.userId !== OPENID) {
        return {
          success: false,
          message: '未找到可编辑的文章'
        }
      }

      await db.collection('user_blog_articles').doc(articleId).update({
        data: {
          ...nextArticleData,
          createdAt: currentArticle.createdAt || now,
          publishedAt: currentArticle.publishedAt || now,
          viewCount: typeof currentArticle.viewCount === 'number' ? currentArticle.viewCount : 0,
        }
      })

      await syncCategoryCount(OPENID, category._id)

      if (currentArticle.categoryId && currentArticle.categoryId !== category._id) {
        await syncCategoryCount(OPENID, currentArticle.categoryId)
      }

      return {
        success: true,
        data: {
          articleId,
          isNew: false,
        }
      }
    }

    const addRes = await db.collection('user_blog_articles').add({
      data: {
        ...nextArticleData,
        viewCount: 0,
        publishedAt: now,
        createdAt: now,
      }
    })

    await syncCategoryCount(OPENID, category._id)

    return {
      success: true,
      data: {
        articleId: addRes._id,
        isNew: true,
      }
    }
  } catch (error) {
    console.error('保存军魂记录文章失败', error)
    return {
      success: false,
      message: '保存军魂记录文章失败',
      error,
    }
  }
}
