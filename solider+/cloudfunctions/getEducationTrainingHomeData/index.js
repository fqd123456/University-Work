const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_TYPE_CACHED })

const db = cloud.database()

const DEFAULT_REGION_ID = 'jx_fuzhou'

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : []
}

const programStatusPriority = {
  报名中: 0,
  即将开班: 1,
  培训中: 2,
  已结业: 3,
}

const registrationStagePriority = {
  待开班: 0,
  培训中: 0,
  审核中: 1,
  已结业: 2,
  未通过: 3,
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

const sortPrograms = (list) => {
  return normalizeArray(list).sort((left, right) => {
    if (!!left.isRecommended !== !!right.isRecommended) {
      return left.isRecommended ? -1 : 1
    }

    const leftPriority = typeof programStatusPriority[left.programStatus] === 'number'
      ? programStatusPriority[left.programStatus]
      : 99
    const rightPriority = typeof programStatusPriority[right.programStatus] === 'number'
      ? programStatusPriority[right.programStatus]
      : 99

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return `${right.updatedAt || ''}`.localeCompare(`${left.updatedAt || ''}`)
  })
}

const sortRegistrations = (list) => {
  return normalizeArray(list).sort((left, right) => {
    const leftPriority = typeof registrationStagePriority[left.stage] === 'number'
      ? registrationStagePriority[left.stage]
      : 99
    const rightPriority = typeof registrationStagePriority[right.stage] === 'number'
      ? registrationStagePriority[right.stage]
      : 99

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return `${right.updatedAt || ''}`.localeCompare(`${left.updatedAt || ''}`)
  })
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const regionId = event && event.regionId ? `${event.regionId}` : DEFAULT_REGION_ID

  try {
    const [policyRes, programsRes, registrationRes] = await Promise.all([
      db.collection('regional_training_policies').doc(regionId).get().catch(() => ({ data: null })),
      db.collection('training_programs')
        .where({
          regionId,
          isActive: true,
        })
        .limit(20)
        .get(),
      db.collection('user_training_registrations')
        .where({
          userId: OPENID,
          regionId,
        })
        .limit(20)
        .get(),
    ])

    const policy = policyRes && policyRes.data ? policyRes.data : null
    const programs = sortPrograms(programsRes.data)
    const normalizedRegistrations = await promoteRegistrationsIfNeeded(registrationRes.data)
    const registrations = sortRegistrations(normalizedRegistrations)
    const currentRegistration = registrations.length ? registrations[0] : null
    const activeCount = registrations.filter((item) => item && (item.stage === '审核中' || item.stage === '待开班' || item.stage === '培训中')).length
    const completedCount = registrations.filter((item) => item && item.stage === '已结业').length
    const recommendedPrograms = programs.filter((item) => item && item.isRecommended).slice(0, 4)

    return {
      success: true,
      data: {
        regionId,
        regionName: policy && policy.regionName
          ? policy.regionName
          : programs[0] && programs[0].regionName
            ? programs[0].regionName
            : '当前地区',
        province: policy && policy.province
          ? policy.province
          : programs[0] && programs[0].province
            ? programs[0].province
            : '江西省',
        city: policy && policy.city
          ? policy.city
          : programs[0] && programs[0].city
            ? programs[0].city
            : '抚州市',
        policy,
        recommendedPrograms: recommendedPrograms.length ? recommendedPrograms : programs.slice(0, 4),
        statusSummary: {
          hasRegistration: registrations.length > 0,
          currentStage: currentRegistration ? currentRegistration.stage : '',
          latestProgramTitle: currentRegistration ? currentRegistration.title : '',
          activeCount,
          completedCount,
        },
      }
    }
  } catch (error) {
    console.error('获取教育培训首页数据失败', error)
    return {
      success: false,
      message: '获取教育培训首页数据失败',
      error,
    }
  }
}
