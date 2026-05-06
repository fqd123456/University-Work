const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const stagePriority = {
  待开班: 0,
  培训中: 0,
  审核中: 1,
  已结业: 2,
  未通过: 3,
}

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

const shouldPromoteRegistration = (item) => {
  if (!item || item.stage !== '审核中' || !item.autoApproveAt) {
    return false
  }

  const approveTime = new Date(item.autoApproveAt).getTime()
  return !Number.isNaN(approveTime) && approveTime <= Date.now()
}

const promoteRegistrationsIfNeeded = async (list) => {
  const items = normalizeArray(list)
  const promoteList = items.filter(shouldPromoteRegistration)

  if (!promoteList.length) {
    return items
  }

  await Promise.all(promoteList.map((item) => (
    db.collection('user_training_registrations').doc(item._id).update({
      data: {
        stage: '待开班',
        auditNote: '审核已完成，请留意开班通知并按时参加培训。',
        updatedAt: item.autoApproveAt || new Date().toISOString(),
      }
    })
  )))

  return items.map((item) => {
    if (!shouldPromoteRegistration(item)) {
      return item
    }

    return {
      ...item,
      stage: '待开班',
      auditNote: '审核已完成，请留意开班通知并按时参加培训。',
      updatedAt: item.autoApproveAt || item.updatedAt,
    }
  })
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const regionId = event && event.regionId ? `${event.regionId}`.trim() : ''
  const condition = regionId
    ? { userId: OPENID, regionId }
    : { userId: OPENID }

  try {
    const listRes = await db.collection('user_training_registrations')
      .where(condition)
      .limit(50)
      .get()

    const normalizedList = await promoteRegistrationsIfNeeded(listRes.data)
    const list = normalizeArray(normalizedList).sort((left, right) => {
      const leftPriority = typeof stagePriority[left.stage] === 'number' ? stagePriority[left.stage] : 99
      const rightPriority = typeof stagePriority[right.stage] === 'number' ? stagePriority[right.stage] : 99

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      return `${right.updatedAt || ''}`.localeCompare(`${left.updatedAt || ''}`)
    })

    return {
      success: true,
      data: {
        list,
        summary: {
          activeCount: list.filter((item) => item && (item.stage === '审核中' || item.stage === '待开班' || item.stage === '培训中')).length,
          completedCount: list.filter((item) => item && item.stage === '已结业').length,
        },
      }
    }
  } catch (error) {
    console.error('获取培训状态失败', error)
    return {
      success: false,
      message: '获取培训状态失败',
      error,
    }
  }
}
