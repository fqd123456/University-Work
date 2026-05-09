import { Text, View } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { SETTLEMENT_LABEL } from '../../../../utils/location'
import {
  DEFAULT_DIRECTORY_REGION_ID,
  DEFAULT_DIRECTORY_REGION_TREE,
  findRegionSelectionByRegionId,
  getRegionSelectionFromIndices,
  RegionProvinceOption,
} from '../../../DirectoryShared/regionUtils'
import { TrainingProgram } from '../../types'
import './index.scss'

type ListResult = {
  success?: boolean
  message?: string
  data?: {
    regionId: string
    regionName: string
    province: string
    city: string
    list: TrainingProgram[]
  }
}

type RegionOptionsResult = {
  success?: boolean
  data?: {
    defaultRegionId?: string
    tree?: RegionProvinceOption[]
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const statusClassMap = {
  报名中: 'training-program-item-status-open',
  即将开班: 'training-program-item-status-upcoming',
  培训中: 'training-program-item-status-running',
  已结业: 'training-program-item-status-completed',
}

const TrainingPrograms = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const regionIdParam = router && router.params && router.params.regionId ? router.params.regionId : ''

  const [regionName, setRegionName] = useState('当前地区')
  const [province, setProvince] = useState('江西省')
  const [city, setCity] = useState('抚州市')
  const [locationNote, setLocationNote] = useState('')
  const [list, setList] = useState<TrainingProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

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

  const resolveRegionId = async () => {
    if (regionIdParam) {
      return regionIdParam
    }

    const regionConfig = await loadRegionTree()
    const fallbackRegion = findRegionSelectionByRegionId(regionConfig.tree, regionConfig.defaultRegionId)
      || getRegionSelectionFromIndices(regionConfig.tree, [0, 0, 0])

    setLocationNote(
      `当前按安置位置 ${SETTLEMENT_LABEL} 为你展示培训课程。`
    )

    return fallbackRegion.regionId
  }

  const loadPrograms = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const regionId = await resolveRegionId()
      const res = await Taro.cloud.callFunction({
        name: 'getTrainingPrograms',
        data: {
          regionId,
          page: 1,
          pageSize: 50,
        },
      })
      const result = res.result as ListResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取培训课程失败')
      }

      setRegionName(result.data.regionName)
      setProvince(result.data.province)
      setCity(result.data.city)
      setList(result.data.list || [])
    } catch (error) {
      console.error('加载培训报名列表失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadPrograms()
  })

  const goToDetail = (item: TrainingProgram) => {
    if (!item._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Detail/index?programId=${item._id}`,
    })
  }

  return (
    <View className='training-program-page'>
      <View className='training-program-hero'>
        <Text className='training-program-hero-tag'>培训报名</Text>
        <Text className='training-program-hero-title'>{city} 培训课程</Text>
        <Text className='training-program-hero-desc'>
          当前以 {province} 的城市培训资源为主，点击课程卡片可查看详细培训方案并提交报名。
        </Text>
        <Text className='training-program-hero-note'>{locationNote || `${regionName} 当前共有 ${list.length} 个培训项目`}</Text>
      </View>

      {loading && (
        <LightLoading text='正在获取当前城市培训课程...' />
      )}

      {!loading && errorText && (
        <View className='training-program-status-card training-program-status-card-error' onClick={loadPrograms}>
          <Text className='training-program-status-title'>加载失败</Text>
          <Text className='training-program-status-desc'>{errorText}</Text>
          <Text className='training-program-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {list.length ? (
            <View className='training-program-list'>
              {list.map((item) => (
                <View
                  key={item._id || item.title}
                  className='training-program-item'
                  onClick={() => goToDetail(item)}
                >
                  <View className='training-program-item-head'>
                    <View className='training-program-item-main'>
                      <Text className='training-program-item-title'>{item.title}</Text>
                    </View>
                    <Text className='training-program-item-count'>已报名 {item.enrolledCount} 人</Text>
                  </View>

                  <Text className='training-program-item-provider'>{item.providerName}</Text>
                  <Text className='training-program-item-address'>{item.address}</Text>

                  <View className='training-program-item-foot'>
                    <Text className='training-program-item-chip'>{item.category}</Text>
                    <Text className={`training-program-item-status ${statusClassMap[item.programStatus] || ''}`}>
                      {item.programStatus}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='training-program-empty-card'>
              <Text className='training-program-empty-title'>当前城市暂无培训课程</Text>
              <Text className='training-program-empty-desc'>可以先在云数据库 `training_programs` 中补充该地区课程。</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export default TrainingPrograms
