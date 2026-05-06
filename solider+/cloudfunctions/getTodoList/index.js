const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const normalizeArray = (value) => (Array.isArray(value) ? value : [])

const sortTodos = (list) => {
  return normalizeArray(list).sort((left, right) => {
    if (!!left.isCompleted !== !!right.isCompleted) {
      return left.isCompleted ? 1 : -1
    }

    if (!left.isCompleted && !right.isCompleted) {
      return `${right.updatedAt || ''}`.localeCompare(`${left.updatedAt || ''}`)
    }

    return `${right.completedAt || right.updatedAt || ''}`.localeCompare(`${left.completedAt || left.updatedAt || ''}`)
  })
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  try {
    const todoRes = await db.collection('user_todos')
      .where({
        userId: OPENID,
        isDeleted: false,
      })
      .limit(100)
      .get()

    const list = sortTodos(todoRes.data)
    const pendingList = list.filter((item) => !item.isCompleted)
    const completedList = list.filter((item) => !!item.isCompleted)

    return {
      success: true,
      data: {
        list,
        previewList: list.slice(0, 3),
        summary: {
          totalCount: list.length,
          pendingCount: pendingList.length,
          completedCount: completedList.length,
        },
      }
    }
  } catch (error) {
    console.error('获取待办事项失败', error)
    return {
      success: false,
      message: '获取待办事项失败',
      error,
    }
  }
}
