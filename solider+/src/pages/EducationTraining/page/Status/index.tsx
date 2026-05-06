import { Text, View } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { TrainingRegistration } from '../../types'
import './index.scss'

type StatusResult = {
  success?: boolean
  message?: string
  data?: {
    list?: TrainingRegistration[]
    summary?: {
      activeCount?: number
      completedCount?: number
    }
  }
}

const stageClassMap = {
  审核中: 'training-status-chip-pending',
  待开班: 'training-status-chip-upcoming',
  培训中: 'training-status-chip-running',
  已结业: 'training-status-chip-done',
  未通过: 'training-status-chip-rejected',
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const TrainingStatus = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : ''

  const [list, setList] = useState<TrainingRegistration[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadStatus = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getTrainingRegistrations',
        data: {
          regionId,
        },
      })
      const result = res.result as StatusResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取培训状态失败')
      }

      setList(result.data.list || [])
      setActiveCount(result.data.summary && result.data.summary.activeCount ? result.data.summary.activeCount : 0)
      setCompletedCount(result.data.summary && result.data.summary.completedCount ? result.data.summary.completedCount : 0)
    } catch (error) {
      console.error('加载培训状态失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadStatus()
  })

  const goToPrograms = () => {
    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Programs/index${regionId ? `?regionId=${regionId}` : ''}`,
    })
  }

  const goToDetail = (item: TrainingRegistration) => {
    if (!item.programId) {
      return
    }

    Taro.navigateTo({
      url: `/pages/EducationTraining/page/Detail/index?programId=${item.programId}`,
    })
  }

  return (
    <View className='training-status-page'>
      <View className='training-status-hero'>
        <Text className='training-status-hero-tag'>培训状态</Text>
        <Text className='training-status-hero-title'>跟踪培训审核、在训和结业进度</Text>
        <Text className='training-status-hero-desc'>报名成功后，培训状态会自动记录在这里，方便你随时查看审核结果和当前进度。</Text>
      </View>

      {loading && (
        <LightLoading text='正在获取你的培训状态...' />
      )}

      {!loading && errorText && (
        <View className='training-status-card training-status-card-error' onClick={loadStatus}>
          <Text className='training-status-card-title'>加载失败</Text>
          <Text className='training-status-card-desc'>{errorText}</Text>
          <Text className='training-status-card-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {list.length ? (
            <>
              <View className='training-status-summary'>
                <View className='training-status-metric'>
                  <Text className='training-status-metric-value'>{activeCount}</Text>
                  <Text className='training-status-metric-label'>进行中</Text>
                </View>
                <View className='training-status-divider' />
                <View className='training-status-metric'>
                  <Text className='training-status-metric-value'>{completedCount}</Text>
                  <Text className='training-status-metric-label'>已结业</Text>
                </View>
              </View>

              <View className='training-status-list'>
                {list.map((item) => (
                  <View
                    key={item._id || `${item.programId}-${item.registeredAt}`}
                    className='training-status-item'
                    onClick={() => goToDetail(item)}
                  >
                    <View className='training-status-item-head'>
                      <View className='training-status-item-main'>
                        <Text className='training-status-item-title'>{item.title}</Text>
                        <Text className='training-status-item-provider'>{item.providerName}</Text>
                      </View>
                      <Text className={`training-status-chip ${stageClassMap[item.stage]}`}>
                        {item.stage}
                      </Text>
                    </View>

                    <Text className='training-status-item-meta'>报名时间：{item.registeredAt}</Text>
                    <Text className='training-status-item-meta'>培训时间：{item.trainingStartAt} 至 {item.trainingEndAt}</Text>
                    <Text className='training-status-item-meta'>培训地址：{item.address}</Text>
                    <Text className='training-status-item-meta'>{item.auditNote}</Text>
                    {!!item.completionNote && <Text className='training-status-item-meta'>{item.completionNote}</Text>}
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View className='training-status-empty-card'>
              <Text className='training-status-empty-title'>未参加任何培训</Text>
              <Text className='training-status-empty-desc'>还没有培训报名记录，去看看当前城市可报名的培训课程吧。</Text>
              <View className='training-status-empty-btn' onClick={goToPrograms}>
                <Text className='training-status-empty-btn-text'>去参加</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export default TrainingStatus
