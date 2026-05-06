const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const shouldPromoteRegistration = (item) => {
  if (!item || item.stage !== '审核中' || !item.autoApproveAt) {
    return false
  }

  const approveTime = new Date(item.autoApproveAt).getTime()
  return !Number.isNaN(approveTime) && approveTime <= Date.now()
}

const promoteRegistrationIfNeeded = async (item) => {
  if (!shouldPromoteRegistration(item)) {
    return item
  }

  await db.collection('user_training_registrations').doc(item._id).update({
    data: {
      stage: '待开班',
      auditNote: '审核已完成，请留意开班通知并按时参加培训。',
      updatedAt: item.autoApproveAt || new Date().toISOString(),
    }
  })

  return {
    ...item,
    stage: '待开班',
    auditNote: '审核已完成，请留意开班通知并按时参加培训。',
    updatedAt: item.autoApproveAt || item.updatedAt,
  }
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const programId = event && event.programId ? `${event.programId}` : ''

  if (!programId) {
    return {
      success: false,
      message: '缺少培训项目 ID'
    }
  }

  try {
    const detailRes = await db.collection('training_programs').doc(programId).get().catch(() => ({ data: null }))
    const detail = detailRes && detailRes.data ? detailRes.data : null

    if (!detail) {
      return {
        success: false,
        message: '培训项目不存在'
      }
    }

    const [providerRes, registrationRes] = await Promise.all([
      db.collection('training_providers').doc(detail.providerId).get().catch(() => ({ data: null })),
      db.collection('user_training_registrations')
        .where({
          userId: OPENID,
          programId,
        })
        .limit(1)
        .get(),
    ])

    const currentRegistration = registrationRes.data && registrationRes.data.length ? registrationRes.data[0] : null
    const normalizedRegistration = await promoteRegistrationIfNeeded(currentRegistration)

    return {
      success: true,
      data: {
        detail,
        provider: providerRes && providerRes.data ? providerRes.data : null,
        registration: normalizedRegistration,
      }
    }
  } catch (error) {
    console.error('获取培训详情失败', error)
    return {
      success: false,
      message: '获取培训详情失败',
      error,
    }
  }
}
