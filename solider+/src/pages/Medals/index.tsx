import { Text, View } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../components/LightLoading'
import { ensureLoggedIn } from '../../utils/auth'
import { MedalCategory, UserMedal, UserMedalsData } from './types'
import './index.scss'

type MedalResult = {
  success?: boolean
  message?: string
  data?: UserMedalsData
}

const initialData: UserMedalsData = {
  categories: [],
  summary: {
    totalCount: 0,
    achievedCount: 0,
    latestAchievedMedalName: '',
    latestAchievedAt: '',
    healthAchievedCount: 0,
    blogAchievedCount: 0,
    healthLogCount: 0,
    articleCount: 0,
  },
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const Medals = () => {
  const [pageData, setPageData] = useState<UserMedalsData>(initialData)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [authorized, setAuthorized] = useState(false)

  const loadPageData = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getUserMedals',
      })
      const result = res.result as MedalResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取个人勋章数据失败')
      }

      setPageData(result.data)
    } catch (error) {
      console.error('加载个人勋章数据失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    const passed = ensureLoggedIn({ redirect: true })
    setAuthorized(passed)

    if (!passed) {
      setPageData(initialData)
      setLoading(false)
      setErrorText('')
      return
    }

    void loadPageData()
  })

  const handleShowTips = (medal: UserMedal) => {
    const tipLines = [
      medal.description,
      `获得条件：${medal.condition}`,
    ]

    if (medal.achieved && medal.achievedAtLabel) {
      tipLines.push(`获得时间：${medal.achievedAtLabel}`)
    }

    Taro.showModal({
      title: medal.name,
      content: tipLines.join('\n'),
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#8b3636',
    })
  }

  if (!authorized) {
    return <View className='medals-page' />
  }

  return (
    <View className='medals-page'>
      <View className='medals-summary-card'>
        <View className='medals-summary-top'>
          <View>
            <Text className='medals-summary-title'>荣耀奖章</Text>
            <Text className='medals-summary-subtitle'>两类勋章可同时获得，记录越多点亮越多。</Text>
          </View>
          <View className='medals-summary-badge'>
            <Text className='medals-summary-badge-text'>{pageData.summary.achievedCount}/{pageData.summary.totalCount}</Text>
          </View>
        </View>

        <View className='medals-summary-metrics'>
          <View className='medals-summary-metric'>
            <Text className='medals-summary-metric-value'>{pageData.summary.healthAchievedCount}</Text>
            <Text className='medals-summary-metric-label'>身体勋章</Text>
          </View>
          <View className='medals-summary-metric'>
            <Text className='medals-summary-metric-value'>{pageData.summary.blogAchievedCount}</Text>
            <Text className='medals-summary-metric-label'>军魂勋章</Text>
          </View>
          <View className='medals-summary-metric'>
            <Text className='medals-summary-metric-value'>{pageData.summary.latestAchievedMedalName || '--'}</Text>
            <Text className='medals-summary-metric-label'>最近获得</Text>
          </View>
        </View>
      </View>

      {loading && (
        <LightLoading text='正在整理你的荣耀奖章...' />
      )}

      {!loading && errorText && (
        <View className='medals-status-card medals-status-card-error' onClick={loadPageData}>
          <Text className='medals-status-title'>加载失败</Text>
          <Text className='medals-status-desc'>{errorText}</Text>
          <Text className='medals-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && pageData.categories.map((category: MedalCategory) => (
        <View key={category.key} className='medals-group-card'>
          <View className='medals-group-head'>
            <View>
              <Text className='medals-group-title'>{category.title}</Text>
              <Text className='medals-group-subtitle'>{category.subtitle}</Text>
            </View>
            <Text className='medals-group-count'>
              {category.medals.filter((item) => item.achieved).length}/{category.medals.length}
            </Text>
          </View>

          <View className='medals-grid'>
            {category.medals.map((medal) => (
              <View
                key={medal.id}
                className={`medals-item ${medal.achieved ? 'medals-item-active' : 'medals-item-locked'}`}
                onClick={() => handleShowTips(medal)}
              >
                <View className={`medals-item-icon ${medal.achieved ? 'medals-item-icon-active' : 'medals-item-icon-locked'}`}>
                  <Text className={`medals-item-icon-text ${medal.achieved ? 'medals-item-icon-text-active' : 'medals-item-icon-text-locked'}`}>
                    {medal.icon}
                  </Text>
                </View>
                <Text className={`medals-item-name ${medal.achieved ? 'medals-item-name-active' : 'medals-item-name-locked'}`}>
                  {medal.name}
                </Text>
                <Text className='medals-item-status'>
                  {medal.achieved ? '已获得' : '未获得'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

export default Medals
