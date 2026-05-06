const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

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
  const content = event && event.content ? `${event.content}`.trim() : ''

  if (!content) {
    return {
      success: false,
      message: '请输入待办内容'
    }
  }

  if (content.length > 60) {
    return {
      success: false,
      message: '待办内容请控制在 60 字以内'
    }
  }

  try {
    const now = formatNow()
    const data = {
      userId: OPENID,
      content,
      isCompleted: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      completedAt: '',
    }

    const addRes = await db.collection('user_todos').add({ data })

    return {
      success: true,
      data: {
        _id: addRes._id,
        ...data,
      }
    }
  } catch (error) {
    console.error('新增待办事项失败', error)
    return {
      success: false,
      message: '新增待办事项失败',
      error,
    }
  }
}
