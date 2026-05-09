import { Text, View } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../components/LightLoading'
import { ensureLoggedIn } from '../../utils/auth'
import { SETTLEMENT_CITY, SETTLEMENT_LABEL, SETTLEMENT_PROVINCE, SETTLEMENT_REGION_NAME } from '../../utils/location'
import {
  DEFAULT_DIRECTORY_REGION_ID,
  DEFAULT_DIRECTORY_REGION_TREE,
  findRegionSelectionByRegionId,
  getRegionSelectionFromIndices,
  RegionProvinceOption,
} from '../DirectoryShared/regionUtils'
import { EducationTrainingHomeData, TrainingProgram } from './types'
import './index.scss'

type HomeResult = {
  success?: boolean
  message?: string
  data?: EducationTrainingHomeData
}

type RegionOptionsResult = {
  success?: boolean
  data?: {
    defaultRegionId?: string
    tree?: RegionProvinceOption[]
  }
}

const initialHomeData: EducationTrainingHomeData = {
  regionId: DEFAULT_DIRECTORY_REGION_ID,
  regionName: SETTLEMENT_REGION_NAME,
  province: SETTLEMENT_PROVINCE,
  city: SETTLEMENT_CITY,
  policy: null,
  recommendedPrograms: [],
  statusSummary: {
    hasRegistration: false,
    currentStage: '',
    latestProgramTitle: '',
    activeCount: 0,
    completedCount: 0,
  },
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const EducationTraining = () => {
  const [homeData, setHomeData] = useState<EducationTrainingHomeData>(initialHomeData)
  const [locationNote, setLocationNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [authorized, setAuthorized] = useState(false)

  const loadRegionTree = async () => {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'getDirectoryRegionOptions',
      })
      const result = res.result as RegionOptionsResult

      if (result && result.success && result.data && Array.isArray(result.data.tree) && result.data.tree.length) {
        return {
          tree: result.data.tree,
          defaultRegionId: result.data.defaultRegionId || DEFAULT_DIRECTORY_REGION_ID,
        }
      }
    } catch (error) {
      console.error('获取地区联级配置失败，已使用本地配置', error)
    }

    return {
      tree: DEFAULT_DIRECTORY_REGION_TREE,
      defaultRegionId: DEFAULT_DIRECTORY_REGION_ID,
    }
  }

  const loadHomeData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const regionConfig = await loadRegionTree()
      const nextRegionTree = regionConfig.tree
      const fallbackRegion = findRegionSelectionByRegionId(nextRegionTree, regionConfig.defaultRegionId)
        || getRegionSelectionFromIndices(nextRegionTree, [0, 0, 0])
      const currentRegion = fallbackRegion

      setLocationNote(
        `当前按安置位置 ${SETTLEMENT_LABEL} 为你匹配培训资源。`
      )

      const res = await Taro.cloud.callFunction({
        name: 'getEducationTrainingHomeData',
        data: {
          regionId: currentRegion.regionId,
        },
      })
      const result = res.result as HomeResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取教育培训数据失败')
      }

      setHomeData(result.data)
    } catch (error) {
      console.error('加载教育培训数据失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    const passed = ensureLoggedIn({ redirect: true })
    setAuthorized(passed)

    if (!passed) {
      setHomeData(initialHomeData)
      setLocationNote('')
      setLoading(false)
      setErrorText('')
      return
    }

    void loadHomeData()
  })

  const goToPrograms = () => {
    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Programs/index?regionId=${homeData.regionId}`,
    })
  }

  const goToStatus = () => {
    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Status/index?regionId=${homeData.regionId}`,
    })
  }

  const goToPolicy = () => {
    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Policy/index?regionId=${homeData.regionId}`,
    })
  }

  const goToDetail = (item: TrainingProgram) => {
    if (!item._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Detail/index?programId=${item._id}`,
    })
  }

  if (!authorized) {
    return <View className='training-page' />
  }

  return (
    <View className='training-page'>
      <View className='training-location-card'>
        <View className='training-location-head'>
          <View className='training-location-main'>
            <Text className='training-section-label'>安置位置</Text>
            <Text className='training-location-province'>{homeData.province}</Text>
            <Text className='training-location-city'>{homeData.city}</Text>
          </View>
          <View className='training-location-policy-btn' onClick={goToPolicy}>
            <Text className='training-location-policy-btn-text'>查看当地政策</Text>
          </View>
        </View>
        <Text className='training-location-note'>{locationNote}</Text>
      </View>

      {loading && (
        <LightLoading text='正在获取培训政策、课程和报名状态...' />
      )}

      {!loading && errorText && (
        <View className='training-status-card training-status-card-error' onClick={loadHomeData}>
          <Text className='training-status-title'>加载失败</Text>
          <Text className='training-status-desc'>{errorText}</Text>
          <Text className='training-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          <View className='training-module-grid'>
            <View className='training-module-card training-module-card-primary' onClick={goToPrograms}>
              <Text className='training-module-title'>培训报名</Text>
              <Text className='training-module-desc'>查看 {homeData.city} 当前可报名培训课程，进入详情后可直接提交报名。</Text>
              <Text className='training-module-metric'>{homeData.recommendedPrograms.length} 个推荐课程</Text>
            </View>

            <View className='training-module-card training-module-card-secondary' onClick={goToStatus}>
              <Text className='training-module-title'>培训状态</Text>
              <Text className='training-module-desc'>
                {homeData.statusSummary.hasRegistration
                  ? `${homeData.statusSummary.currentStage} · ${homeData.statusSummary.latestProgramTitle || '已报名课程'}`
                  : '未参加任何培训，查看当前报名状态或前往报名页面。'}
              </Text>
              <Text className='training-module-metric'>
                {homeData.statusSummary.hasRegistration
                  ? `${homeData.statusSummary.activeCount} 个进行中`
                  : '去参加'}
              </Text>
            </View>
          </View>

          <View className='training-section'>
            <View className='training-section-head'>
              <View>
                <Text className='training-card-title'>推荐培训课程</Text>
                <Text className='training-section-subtitle'>优先展示当前城市近期可报名课程</Text>
              </View>
              <Text className='training-section-action' onClick={goToPrograms}>查看全部</Text>
            </View>

            {homeData.recommendedPrograms.length ? (
              <View className='training-program-list'>
                {homeData.recommendedPrograms.map((item) => (
                  <View
                    key={item._id || item.title}
                    className='training-program-card'
                    onClick={() => goToDetail(item)}
                  >
                    <View className='training-program-head'>
                      <View className='training-program-main'>
                        <Text className='training-program-title'>{item.title}</Text>
                      </View>
                      <Text className='training-program-count'>已报名 {item.enrolledCount} 人</Text>
                    </View>

                    <Text className='training-program-provider'>{item.providerName}</Text>
                    <Text className='training-program-meta'>{item.address}</Text>

                    <View className='training-program-foot'>
                      <Text className='training-program-category'>{item.category}</Text>
                      <Text className='training-program-link'>查看详情</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className='training-empty-card'>
                <Text className='training-empty-title'>当前城市暂未配置培训课程</Text>
                <Text className='training-empty-desc'>可以先在云数据库 `training_programs` 中补充该地区培训项目。</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  )
}

export default EducationTraining
