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
  const todoId = event && event.todoId ? `${event.todoId}` : ''

  if (!todoId) {
    return {
      success: false,
      message: '缺少待办 ID'
    }
  }

  try {
    const todoRes = await db.collection('user_todos').doc(todoId).get()
    const todo = todoRes.data

    if (!todo || todo.userId !== OPENID || todo.isDeleted) {
      return {
        success: false,
        message: '待办事项不存在'
      }
    }

    await db.collection('user_todos').doc(todoId).update({
      data: {
        isDeleted: true,
        updatedAt: formatNow(),
      }
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('删除待办事项失败', error)
    return {
      success: false,
      message: '删除待办事项失败',
      error,
    }
  }
}
