import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import LightLoading from '../../components/LightLoading'
import VirtualList from '../../components/VirtualList'
import {
  NEWS_CURRENT_ITEM_KEY,
  NEWS_LIST_CACHE_KEY,
  NewsItem,
  newsTabs,
  normalizeNewsItem,
} from './newsData'
import './index.scss'
// 注意：在逻辑计算中，我们需要将 rpx 转换为 px 才能配合 scrollTop 使用
// 这里我们假设 ITEM_HEIGHT = 244rpx (220卡片高度 + 24间距)
// 在 750 屏宽下，1rpx = (屏幕宽度 / 750) px

const getPx = (rpx: number) => (Taro.getSystemInfoSync().windowWidth / 750) * rpx

// 这里的数值要和 CSS 对应 (220高度 + 24间距 = 244)
const ITEM_HEIGHT = Math.floor(getPx(244))
const HEADER_HEIGHT = Math.floor(getPx(100))
const BUFFER_SIZE = 5

const News = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [newsList, setNewsList] = useState<NewsItem[]>([])
  const [listHeight, setListHeight] = useState(600)
  const [showBackTop, setShowBackTop] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [scrollOffset, setScrollOffset] = useState(0)

  useEffect(() => {
    const { windowHeight } = Taro.getSystemInfoSync()
    setListHeight(Math.max(300, windowHeight - HEADER_HEIGHT))

    const cacheList = Taro.getStorageSync(NEWS_LIST_CACHE_KEY)
    if (Array.isArray(cacheList)) {
      const normalizedList = cacheList
        .map(item => normalizeNewsItem(item))
        .filter(Boolean) as NewsItem[]
      if (normalizedList.length) {
        setNewsList(normalizedList)
        setLoading(false)
      }
    }
  }, [])

  const loadNewsList = useCallback(async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getNewsData',
        data: {
          action: 'list',
          limit: 10,
        }
      })

      const result = res.result as any
      if (!result || result.success !== true || !Array.isArray(result.data)) {
        throw new Error(result && result.message ? result.message : '资讯加载失败')
      }

      const nextList = result.data
        .map(item => normalizeNewsItem(item))
        .filter(Boolean) as NewsItem[]

      setNewsList(nextList)
      Taro.setStorageSync(NEWS_LIST_CACHE_KEY, nextList)
    } catch (error) {
      console.error('加载新闻失败', error)
      const cacheList = Taro.getStorageSync(NEWS_LIST_CACHE_KEY)
      if (!Array.isArray(cacheList) || cacheList.length === 0) {
        setErrorText('资讯加载失败，请稍后再试')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNewsList()
  }, [loadNewsList])

  const activeKey = newsTabs[activeTab] ? newsTabs[activeTab].key : newsTabs[0].key
  const list = useMemo(() => {
    return newsList.filter(item => item.tab === activeKey)
  }, [activeKey, newsList])

  const handleTabChange = (index: number) => {
    setActiveTab(index)
    setShowBackTop(false)
    setScrollOffset(prev => (prev === 0 ? 0.01 : 0))
  }

  const handleCardClick = useCallback((item: NewsItem) => {
    Taro.setStorageSync(NEWS_CURRENT_ITEM_KEY, item)
    Taro.navigateTo({ url: `/pages/News/page/NewsDetail/index?id=${item.id}` })
  }, [])

  const handleBackTop = () => {
    setScrollOffset(prev => (prev === 0 ? 0.01 : 0))
  }

  const handleScroll = useCallback((event) => {
    const top = event.detail.scrollTop
    setShowBackTop(top > 30)
  }, [])

  return (
    <View className='news-page'>
      <View className='news-header'>
        <ScrollView className='news-tabs' scrollX showScrollbar={false} enhanced>
          <View className='news-tabs-track'>
            {newsTabs.map((tab, index) => (
              <View
                key={tab.key}
                className={`news-tab ${index === activeTab ? 'active' : ''}`}
                onClick={() => handleTabChange(index)}
              >
                <Text>{tab.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <VirtualList
        items={list}
        itemHeight={ITEM_HEIGHT}
        height={listHeight}
        bufferSize={BUFFER_SIZE}
        className='news-list'
        scrollTop={scrollOffset}
        scrollWithAnimation
        onScroll={handleScroll}
        keyExtractor={item => item.id}
        renderItem={item => (
          <View
            className='news-item'
            style={{ height: `${ITEM_HEIGHT}px` }}
            onClick={() => handleCardClick(item)}
          >
            <View className='news-card'>
              <Text className='news-title'>{item.title}</Text>
              <View className='news-meta'>
                <Text className='news-source'>{item.source}</Text>
                <Text className='news-time'>{item.time}</Text>
              </View>
            </View>
          </View>
        )}
      >
        {loading && newsList.length === 0 ? (
          <LightLoading text='正在加载最新资讯...' />
        ) : errorText && newsList.length === 0 ? (
          <View className='news-status'>
            <Text className='news-status-text'>{errorText}</Text>
            <View className='news-status-btn' onClick={loadNewsList}>
              <Text className='news-status-btn-text'>重新加载</Text>
            </View>
          </View>
        ) : list.length === 0 ? (
          <View className='news-status'>
            <Text className='news-status-text'>当前分类暂无资讯</Text>
          </View>
        ) : null}
      </VirtualList>

      {showBackTop && (
        <View className='back-top' onClick={handleBackTop}>
          <Text className='back-top-icon'>↑</Text>
        </View>
      )}
    </View>
  )
}

export default News
