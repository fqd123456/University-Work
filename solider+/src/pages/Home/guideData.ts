import Taro from '@tarojs/taro'

export const GUIDE_COMPLETION_STORAGE_KEY = 'guide_step_completion'
export const DEFAULT_GUIDE_REGION_ID = 'jx_fuzhou'

export type GuideStep = {
  id: string
  title: string
  desc: string
  summary: string
  locationName: string
  address: string
  latitude: number
  longitude: number
  materials: string[]
  buttonText: string
}

type GuideStepsResult = {
  success?: boolean
  data?: {
    steps?: GuideStep[]
  }
}

type GuideProgressResult = {
  success?: boolean
  data?: {
    completedStepIds?: string[]
  }
}

// 云端未返回时的兜底示例数据。
export const guideSteps: GuideStep[] = [
  {
    id: 'report',
    title: '报到',
    desc: '退役军人事务局',
    summary: '完成退役报到和基础信息登记，建立后续服务档案。',
    locationName: '抚州市退役军人事务局服务大厅（示例）',
    address: '抚州市迎宾大道 128 号政务服务中心 1 楼',
    latitude: 27.949531,
    longitude: 116.358492,
    materials: [
      '身份证原件及复印件',
      '退伍证或相关退役证明',
      '近期 1 寸免冠照片 2 张',
      '个人联系方式与家庭住址信息'
    ],
    buttonText: '完成报到指引'
  },
  {
    id: 'insurance',
    title: '保险',
    desc: '社保局',
    summary: '办理社保接续、医保关系衔接等退役后保障事项。',
    locationName: '抚州市社会保险服务中心（示例）',
    address: '抚州市临川大道 88 号人社服务大厅 2 楼',
    latitude: 27.953114,
    longitude: 116.366851,
    materials: [
      '身份证原件及复印件',
      '退伍证原件及复印件',
      '部队社保缴费凭证或转移材料',
      '银行卡信息'
    ],
    buttonText: '完成保险办理'
  },
  {
    id: 'training',
    title: '培训',
    desc: '退役军人事务局（可选）',
    summary: '根据个人意向报名职业技能培训或学历提升项目。',
    locationName: '抚州市退役军人就业创业中心（示例）',
    address: '抚州市赣东大道 66 号创业服务楼 3 楼',
    latitude: 27.947203,
    longitude: 116.353617,
    materials: [
      '身份证原件及复印件',
      '退伍证原件及复印件',
      '学历证明材料',
      '个人培训意向或求职方向说明'
    ],
    buttonText: '完成培训登记'
  },
  {
    id: 'relation-transfer',
    title: '组织关系转移',
    desc: '人民政府',
    summary: '办理党团组织关系转接，确保组织关系及时落地。',
    locationName: '抚州市人民政府便民服务窗口（示例）',
    address: '抚州市行政中心东附楼 1 楼综合窗口',
    latitude: 27.955842,
    longitude: 116.361247,
    materials: [
      '组织关系介绍信',
      '身份证原件及复印件',
      '退伍证原件及复印件',
      '拟接收组织信息'
    ],
    buttonText: '完成关系转移'
  },
  {
    id: 'benefit-card',
    title: '优待证',
    desc: '退役军人服务站',
    summary: '提交优待证申领资料，完成信息核验与制卡申请。',
    locationName: '抚州市退役军人服务站（示例）',
    address: '抚州市惠民路 20 号社区服务中心 1 楼',
    latitude: 27.944968,
    longitude: 116.369214,
    materials: [
      '身份证原件及复印件',
      '退伍证原件及复印件',
      '近期白底证件照电子版或纸质版',
      '本人银行卡及手机号'
    ],
    buttonText: '完成优待证申请'
  }
]

export const getGuideStepById = (stepId?: string, steps: GuideStep[] = guideSteps) => {
  return steps.find(item => item.id === stepId)
}

export const getGuideCompletionMap = (): Record<string, boolean> => {
  const cache = Taro.getStorageSync(GUIDE_COMPLETION_STORAGE_KEY)

  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) {
    return {}
  }

  return cache as Record<string, boolean>
}

export const setGuideCompletionMap = (nextMap: Record<string, boolean>) => {
  Taro.setStorageSync(GUIDE_COMPLETION_STORAGE_KEY, nextMap)
  return nextMap
}

export const markGuideStepCompleted = (stepId: string) => {
  const nextMap = {
    ...getGuideCompletionMap(),
    [stepId]: true,
  }

  return setGuideCompletionMap(nextMap)
}

export const getCompletedStepIds = (completionMap: Record<string, boolean>) => {
  return Object.keys(completionMap).filter((stepId) => completionMap[stepId])
}

export const getGuideRegionId = () => {
  return DEFAULT_GUIDE_REGION_ID
}

const buildCompletionMap = (completedStepIds?: string[]) => {
  if (!Array.isArray(completedStepIds)) {
    return {}
  }

  return completedStepIds.reduce<Record<string, boolean>>((map, stepId) => {
    if (stepId) {
      map[stepId] = true
    }
    return map
  }, {})
}

const mergeCompletionMaps = (
  localMap: Record<string, boolean>,
  remoteMap: Record<string, boolean>
) => {
  return {
    ...localMap,
    ...remoteMap,
  }
}

const saveGuideProgressToCloud = async (stepId: string, regionId = DEFAULT_GUIDE_REGION_ID) => {
  return Taro.cloud.callFunction({
    name: 'saveGuideProgress',
    data: {
      stepId,
      regionId,
    }
  })
}

export const loadRegionalGuideSteps = async (regionId = DEFAULT_GUIDE_REGION_ID) => {
  try {
    const res = await Taro.cloud.callFunction({
      name: 'getRegionalGuideSteps',
      data: {
        regionId,
      }
    })
    const result = res.result as GuideStepsResult

    if (result && result.success && result.data && Array.isArray(result.data.steps) && result.data.steps.length) {
      return result.data.steps
    }
  } catch (error) {
    console.error('加载退伍指引步骤失败', error)
  }

  return guideSteps
}

export const syncGuideCompletionMap = async (regionId = DEFAULT_GUIDE_REGION_ID) => {
  const localMap = getGuideCompletionMap()

  try {
    const res = await Taro.cloud.callFunction({
      name: 'getGuideProgress',
      data: {
        regionId,
      }
    })
    const result = res.result as GuideProgressResult
    const remoteMap = buildCompletionMap(result && result.data ? result.data.completedStepIds : [])
    const mergedMap = mergeCompletionMaps(localMap, remoteMap)
    const missingRemoteIds = getCompletedStepIds(localMap).filter((stepId) => !remoteMap[stepId])

    if (missingRemoteIds.length) {
      await Promise.all(missingRemoteIds.map((stepId) => saveGuideProgressToCloud(stepId, regionId)))
    }

    return setGuideCompletionMap(mergedMap)
  } catch (error) {
    console.error('同步退伍指引进度失败', error)
    return localMap
  }
}

export const completeGuideStep = async (stepId: string, regionId = DEFAULT_GUIDE_REGION_ID) => {
  const localNextMap = markGuideStepCompleted(stepId)

  try {
    const res = await saveGuideProgressToCloud(stepId, regionId)
    const result = res.result as GuideProgressResult
    const remoteMap = buildCompletionMap(result && result.data ? result.data.completedStepIds : [])
    const mergedMap = mergeCompletionMaps(localNextMap, remoteMap)

    return setGuideCompletionMap(mergedMap)
  } catch (error) {
    console.error('保存退伍指引进度失败', error)
    return localNextMap
  }
}
