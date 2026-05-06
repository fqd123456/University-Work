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

const extractHtmlImageList = (html) => {
  const result = []
  const matcher = /<img[^>]+src=["']([^"']+)["']/gi
  let matched = matcher.exec(`${html || ''}`)

  while (matched) {
    result.push(normalizeUrlValue(matched[1]))
    matched = matcher.exec(`${html || ''}`)
  }

  return uniqueStringArray(result)
}

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

const resolveHtmlImageUrls = (html, fileMap) => {
  return `${html || ''}`.replace(/(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/gi, (_, prefix, src, suffix) => {
    return `${prefix}${resolveAssetUrl(src, fileMap)}${suffix}`
  })
}

const restoreHtmlImageFileIds = (html, imageList) => {
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

const normalizeArticleAssets = (article) => {
  const imageList = uniqueStringArray(article && article.imageList)
  const coverImage = normalizeUrlValue(article && article.coverImage ? article.coverImage : imageList[0] || '')
  const contentHtml = `${article && article.contentHtml ? article.contentHtml : ''}`

  return {
    ...article,
    coverImage,
    imageList,
    contentHtml,
  }
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const articleId = normalizeString(event.articleId)
  const shouldTrackView = !(event.trackView === false || event.trackView === 'false')
  const shouldResolveAssetUrls = !(event.resolveAssetUrls === false || event.resolveAssetUrls === 'false' || !shouldTrackView)

  if (!articleId) {
    return {
      success: false,
      message: '缺少文章 ID'
    }
  }

  try {
    const articleRes = await db.collection('user_blog_articles').doc(articleId).get().catch(() => ({ data: null }))
    const article = articleRes && articleRes.data ? articleRes.data : null

    if (!article || article.userId !== OPENID) {
      return {
        success: false,
        message: '未找到该文章'
      }
    }

    const nextViewCount = shouldTrackView
      ? (typeof article.viewCount === 'number' ? article.viewCount + 1 : 1)
      : (typeof article.viewCount === 'number' ? article.viewCount : 0)

    if (shouldTrackView) {
      await db.collection('user_blog_articles').doc(articleId).update({
        data: {
          viewCount: _.inc(1),
        }
      }).catch(() => null)
    }

    const relatedRes = article.categoryId
      ? await db.collection('user_blog_articles')
        .where({
          userId: OPENID,
          status: 'published',
          categoryId: article.categoryId,
          _id: _.neq(articleId),
        })
        .orderBy('updatedAt', 'desc')
        .limit(3)
        .get()
      : { data: [] }

    const normalizedArticle = normalizeArticleAssets(article)
    const normalizedContentHtml = restoreHtmlImageFileIds(normalizedArticle.contentHtml, normalizedArticle.imageList)
    const relatedArticles = normalizeArray(relatedRes.data).map((item) => normalizeArticleAssets(item))
    const rawAssetList = uniqueStringArray([
      normalizedArticle.coverImage,
      ...normalizedArticle.imageList,
      ...extractHtmlImageList(normalizedContentHtml),
      ...relatedArticles.map((item) => item.coverImage),
    ])

    const fileMap = shouldResolveAssetUrls
      ? await createTempUrlMap(rawAssetList)
      : {}

    const resolvedArticle = shouldResolveAssetUrls
      ? {
        ...normalizedArticle,
        coverImage: resolveAssetUrl(normalizedArticle.coverImage, fileMap),
        imageList: normalizedArticle.imageList.map((item) => resolveAssetUrl(item, fileMap)),
        contentHtml: resolveHtmlImageUrls(normalizedContentHtml, fileMap),
      }
      : {
        ...normalizedArticle,
        contentHtml: normalizedContentHtml,
      }

    return {
      success: true,
      data: {
        article: {
          ...resolvedArticle,
          viewCount: nextViewCount,
        },
        relatedArticles: shouldResolveAssetUrls
          ? relatedArticles.map((item) => ({
            ...item,
            coverImage: resolveAssetUrl(item.coverImage, fileMap),
          }))
          : relatedArticles,
      }
    }
  } catch (error) {
    console.error('获取军魂记录文章详情失败', error)
    return {
      success: false,
      message: '获取军魂记录文章详情失败',
      error,
    }
  }
}
