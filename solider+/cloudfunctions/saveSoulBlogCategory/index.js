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

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const categoryId = normalizeString(event.categoryId)
  const name = normalizeString(event.name)

  if (!name) {
    return {
      success: false,
      message: '请输入分类名称'
    }
  }

  if (name.length > 12) {
    return {
      success: false,
      message: '分类名称不能超过 12 个字'
    }
  }

  try {
    const [sameNameRes, categoriesCountRes] = await Promise.all([
      db.collection('user_blog_categories')
        .where({
          userId: OPENID,
          name,
        })
        .limit(1)
        .get(),
      db.collection('user_blog_categories')
        .where({ userId: OPENID })
        .count(),
    ])

    const existedSameName = sameNameRes.data && sameNameRes.data.length ? sameNameRes.data[0] : null
    const now = formatNow()

    if (categoryId) {
      const categoryRes = await db.collection('user_blog_categories').doc(categoryId).get().catch(() => ({ data: null }))
      const currentCategory = categoryRes && categoryRes.data ? categoryRes.data : null

      if (!currentCategory || currentCategory.userId !== OPENID) {
        return {
          success: false,
          message: '未找到对应分类'
        }
      }

      if (existedSameName && existedSameName._id !== categoryId) {
        return {
          success: false,
          message: '该分类名称已存在'
        }
      }

      await db.collection('user_blog_categories').doc(categoryId).update({
        data: {
          name,
          updatedAt: now,
        }
      })

      const articleRes = await db.collection('user_blog_articles')
        .where({
          userId: OPENID,
          categoryId,
        })
        .get()

      const articles = articleRes.data || []
      await Promise.all(
        articles.map((item) => {
          return db.collection('user_blog_articles').doc(item._id).update({
            data: {
              categoryName: name,
            }
          })
        })
      )

      return {
        success: true,
        data: {
          _id: categoryId,
          ...currentCategory,
          name,
          updatedAt: now,
        }
      }
    }

    if (existedSameName) {
      return {
        success: true,
        data: existedSameName,
      }
    }

    const categoryData = {
      userId: OPENID,
      name,
      sortOrder: (categoriesCountRes.total || 0) + 1,
      articleCount: 0,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    }

    const addRes = await db.collection('user_blog_categories').add({
      data: categoryData
    })

    return {
      success: true,
      data: {
        _id: addRes._id,
        ...categoryData,
      }
    }
  } catch (error) {
    console.error('保存文章分类失败', error)
    return {
      success: false,
      message: '保存文章分类失败',
      error,
    }
  }
}
