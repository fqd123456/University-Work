import { View, Text, Map, Button } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import {
  completeGuideStep,
  getGuideCompletionMap,
  getGuideRegionId,
  getGuideStepById,
  GuideStep,
  guideSteps,
  loadRegionalGuideSteps,
  syncGuideCompletionMap,
} from '../../guideData'
import './index.scss'

const GuideDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const stepId = router && router.params ? router.params.step : undefined
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => getGuideCompletionMap())
  const [guideItems, setGuideItems] = useState<GuideStep[]>(guideSteps)
  const [pageLoading, setPageLoading] = useState(true)
  const step = getGuideStepById(stepId, guideItems)

  useDidShow(() => {
    const loadGuideDetailData = async () => {
      setPageLoading(true)
      const regionId = getGuideRegionId()
      const [nextGuideItems, nextCompletedMap] = await Promise.all([
        loadRegionalGuideSteps(regionId),
        syncGuideCompletionMap(regionId),
      ])

      setGuideItems(nextGuideItems)
      setCompletedMap(nextCompletedMap)
      setPageLoading(false)
    }

    void loadGuideDetailData()
  })

  useEffect(() => {
    if (step) {
      Taro.setNavigationBarTitle({
        title: `${step.title}指引`
      })
    }
  }, [step])

  const handleOpenLocation = async () => {
    if (!step) return

    try {
      await Taro.openLocation({
        latitude: step.latitude,
        longitude: step.longitude,
        name: step.locationName,
        address: step.address,
        scale: 16,
      })
    } catch (error) {
      console.error('打开地图导航失败', error)
      Taro.showToast({
        title: '打开地图失败',
        icon: 'none',
      })
    }
  }

  const handleComplete = async () => {
    if (!step) return

    const nextMap = await completeGuideStep(step.id, getGuideRegionId())
    setCompletedMap(nextMap)

    Taro.showToast({
      title: '当前步骤已完成',
      icon: 'success',
    })
  }

  const handleMapError = () => {
    Taro.showToast({
      title: '地图加载失败',
      icon: 'none',
    })
  }

  if (pageLoading) {
    return (
      <View className='guide-detail-page guide-detail-page-status'>
        <LightLoading text='正在同步你的办理进度，请稍候。' />
      </View>
    )
  }

  if (!step) {
    return (
      <View className='guide-detail-page guide-detail-page-status'>
        <Text className='guide-status-title'>未找到对应指引</Text>
        <Text className='guide-status-desc'>请返回首页重新选择步骤。</Text>
        <Button
          className='guide-complete-btn'
          onClick={() => Taro.switchTab({ url: '/pages/Home/index' })}
        >
          返回首页
        </Button>
      </View>
    )
  }

  const isCompleted = !!completedMap[step.id]
  const stepIndex = guideItems.findIndex((item) => item.id === step.id)
  const stepOrder = stepIndex >= 0 ? stepIndex + 1 : 1
  const firstPendingStep = guideItems.find((item) => !completedMap[item.id])
  const lastStep = guideItems.length ? guideItems[guideItems.length - 1] : null
  const activeStepId = firstPendingStep ? firstPendingStep.id : lastStep ? lastStep.id : ''
  const isActiveStep = step.id === activeStepId
  const stepStateText = isCompleted ? '已完成' : (isActiveStep ? '进行中' : '未开始')
  const stepStateClass = isCompleted
    ? 'guide-step-state-done'
    : (isActiveStep ? 'guide-step-state-todo' : 'guide-step-state-pending')

  return (
    <View className='guide-detail-page'>
      <View className='guide-step-head'>
        <View className='guide-step-main'>
          <View className='guide-step-index'>
            <Text className='guide-step-index-text'>{stepOrder}</Text>
          </View>
          <Text className='guide-step-name'>{step.title}</Text>
          <Text className={`guide-step-state ${stepStateClass}`}>
            {stepStateText}
          </Text>
        </View>
      </View>
      <Text className='guide-step-note'>{step.summary}</Text>

      <View className='guide-card'>
        <View className='guide-card-header'>
          <Text className='guide-card-title'>地图指引</Text>
          <Text className='guide-card-action' onClick={handleOpenLocation}>点击地图导航</Text>
        </View>
        <Map
          className='guide-map'
          latitude={step.latitude}
          longitude={step.longitude}
          scale={15}
          showLocation
          onError={handleMapError}
          onTap={handleOpenLocation}
        />
        <View className='guide-location-box' onClick={handleOpenLocation}>
          <Text className='guide-location-name'>{step.locationName}</Text>
          <Text className='guide-location-address'>{step.address}</Text>
        </View>
      </View>

      <View className='guide-card'>
        <View className='guide-card-header'>
          <Text className='guide-card-title'>所需材料</Text>
          <Text className='guide-card-subtitle'>办理前请准备齐全</Text>
        </View>
        <View className='guide-material-list'>
          {step.materials.map((material, index) => (
            <View key={material} className='guide-material-item'>
              <View className='guide-material-index'>
                <Text className='guide-material-index-text'>{index + 1}</Text>
              </View>
              <Text className='guide-material-text'>{material}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='guide-card guide-card-footer'>
        <View className='guide-card-header'>
          <Text className='guide-card-title'>完成指引</Text>
          <Text className='guide-card-subtitle'>办结后可回首页继续下一步</Text>
        </View>
        <Button
          className={`guide-complete-btn ${isCompleted ? 'guide-complete-btn-disabled' : ''}`}
          disabled={isCompleted}
          onClick={handleComplete}
        >
          {isCompleted ? '该步骤已完成' : step.buttonText}
        </Button>
      </View>
    </View>
  )
}

export default GuideDetail
