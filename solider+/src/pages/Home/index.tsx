import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import CustomNav from '../../components/HomeNav'
import AppGrid, { GridItem } from '../../components/AppGrid'
import { getRecentHomeServices, recordRecentService, ServiceItem } from '../Service/serviceDate'
import { ensureProtectedPageAccess } from '../../utils/auth'
import { NEWS_CURRENT_ITEM_KEY, NEWS_LIST_CACHE_KEY, NewsItem, normalizeNewsItem } from '../News/newsData'
import {
  GuideStep,
  guideSteps,
  getGuideCompletionMap,
  getGuideRegionId,
  loadRegionalGuideSteps,
  syncGuideCompletionMap,
} from './guideData'
import './index.scss'

const Mine = () => {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => getGuideCompletionMap())
  const [items, setItems] = useState<GuideStep[]>(guideSteps)
  const [serviceData, setServiceData] = useState<GridItem[]>(() => getRecentHomeServices())
  const [newsList, setNewsList] = useState<NewsItem[]>(() => {
    const cacheList = Taro.getStorageSync(NEWS_LIST_CACHE_KEY)
    if (!Array.isArray(cacheList)) {
      return []
    }

    return cacheList
      .map(item => normalizeNewsItem(item))
      .filter((item): item is NewsItem => !!item && item.tab === 'veteran')
      .slice(0, 3)
  })
  const completedCount = items.filter(item => completedMap[item.id]).length
  const isAllCompleted = completedCount === items.length
  const firstPendingStep = items.find(item => !completedMap[item.id])
  const lastStep = items.length ? items[items.length - 1] : null
  const activeStepId = firstPendingStep ? firstPendingStep.id : lastStep ? lastStep.id : ''
  const serviceGridKey = serviceData.map((item) => item.pagePath || item.value).join('|')

  useDidShow(() => {
    const loadGuideData = async () => {
      const regionId = getGuideRegionId()
      const [nextItems, nextCompletedMap] = await Promise.all([
        loadRegionalGuideSteps(regionId),
        syncGuideCompletionMap(regionId),
      ])
      const nextServices = getRecentHomeServices()

      setItems(nextItems)
      setCompletedMap(nextCompletedMap)
      setServiceData(nextServices)
      console.log('[recent-service] Home useDidShow', {
        regionId,
        nextServices: nextServices.map((item) => ({
          value: item.value,
          pagePath: item.pagePath || '',
        })),
      })
    }

    const loadVeteranNews = async () => {
      try {
        const res = await Taro.cloud.callFunction({
          name: 'getNewsData',
          data: {
            action: 'list',
            limit: 12,
          }
        })

        const result = res.result as any
        if (!result || result.success !== true || !Array.isArray(result.data)) {
          return
        }

        const nextList = result.data
          .map(item => normalizeNewsItem(item))
          .filter((item): item is NewsItem => !!item)

        const veteranList = nextList
          .filter(item => item.tab === 'veteran')
          .slice(0, 3)

        if (nextList.length) {
          Taro.setStorageSync(NEWS_LIST_CACHE_KEY, nextList)
        }

        setNewsList(veteranList)
      } catch (error) {
        console.error('首页退役专栏加载失败', error)
      }
    }

    void loadGuideData()
    void loadVeteranNews()
  })

  const goNewsDetail = (item: NewsItem) => {
    Taro.setStorageSync(NEWS_CURRENT_ITEM_KEY, item)
    Taro.navigateTo({ url: `/pages/News/page/NewsDetail/index?id=${item.id}` })
  }

  return (
    <View className='mainPage'>
      <CustomNav />
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>新闻资讯</Text>
          {/* 点击事件，跳转到资讯页 */}
          <Text className='itemRight' onClick={() => Taro.switchTab({ url: '/pages/News/index' })}>查看更多</Text>
        </View>
        <View className='itemContent'>
          {newsList.map(item => (
            <View key={item.id} className='itemNews' onClick={() => goNewsDetail(item)}>
              <Text className='itemCenter'>{item.title}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 退伍指引 */}
      {!isAllCompleted && (
        <View className='card'>
          <View className='itemTitle'>
            <Text className='itemLeft'>退伍指引</Text>
            <Text className='itemRight'>{completedCount}/{items.length} 已完成</Text>
          </View>
          <View className='guide-steps'>
            {items.map((item, index) => (
              <View
                key={item.id}
                className='guide-step'
                onClick={() => Taro.navigateTo({ url: `/pages/Home/page/GuideDetail/index?step=${item.id}` })}
              >
                <View className='guide-step-top'>
                  {index > 0 ? <View className='guide-step-line' /> : <View className='guide-step-line guide-step-line-hidden' />}
                  <View
                    className={[
                      'guide-step-circle',
                      completedMap[item.id] ? 'guide-step-circle-completed' : '',
                      !completedMap[item.id] && item.id === activeStepId ? 'guide-step-circle-active' : ''
                    ].filter(Boolean).join(' ')}
                  >
                    <Text className='guide-step-num'>{index + 1}</Text>
                  </View>
                  {index < items.length - 1 ? <View className='guide-step-line' /> : <View className='guide-step-line guide-step-line-hidden' />}
                </View>
                <Text
                  className={[
                    'guide-step-title',
                    item.id === activeStepId ? 'guide-step-title-active' : ''
                  ].filter(Boolean).join(' ')}
                >
                  {item.title}
                </Text>
                <Text className='guide-step-desc'>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 常用服务 */}
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>常用服务</Text>
        </View>
        {/* 点击进入相关页面 */}
        <AppGrid
          key={serviceGridKey}
          data={serviceData}
          column={4}
          onClick={(item: GridItem) => {
            if (item.pagePath) {
              if (!ensureProtectedPageAccess(item.pagePath)) {
                return
              }

              recordRecentService(item as ServiceItem)
              const nextServices = getRecentHomeServices()
              setServiceData(nextServices)
              console.log('[recent-service] Home onClick', {
                clicked: item.value,
                nextServices: nextServices.map((service) => ({
                  value: service.value,
                  pagePath: service.pagePath || '',
                })),
              })
              Taro.navigateTo({ url: item.pagePath })
              return
            }

            if (item.value === '查看更多') {
              Taro.switchTab({ url: '/pages/Service/index' })
            }
          }}
        />
      </View>
    </View>
  )
}

export default Mine
