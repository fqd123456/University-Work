const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const normalizeString = (value) => `${value || ''}`.trim()

const formatNow = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
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
        message: '未找到可删除的文章'
      }
    }

    await db.collection('user_blog_articles').doc(articleId).remove()
    await syncCategoryCount(OPENID, article.categoryId)

    return {
      success: true,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除军魂记录文章失败', error)
    return {
      success: false,
      message: '删除军魂记录文章失败',
      error,
    }
  }
}
