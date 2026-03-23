import { View, Text } from '@tarojs/components'
import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import {
  NEWS_CURRENT_ITEM_KEY,
  NEWS_DETAIL_CACHE_KEY,
  NEWS_LIST_CACHE_KEY,
  NewsItem,
  normalizeNewsItem,
} from '../../newsData'
import './index.scss'

const NewsDetail = () => {
  const [item, setItem] = useState<NewsItem | null>(null)
  const [content, setContent] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const router = Taro.getCurrentInstance().router
  const id = router && router.params ? router.params.id : undefined

  const getCachedItem = useCallback((newsId?: string) => {
    if (!newsId) return null

    const currentItem = normalizeNewsItem(Taro.getStorageSync(NEWS_CURRENT_ITEM_KEY))
    if (currentItem && currentItem.id === newsId) {
      return currentItem
    }

    const cacheList = Taro.getStorageSync(NEWS_LIST_CACHE_KEY)
    if (!Array.isArray(cacheList)) return null

    const target = cacheList
      .map(item => normalizeNewsItem(item))
      .filter(Boolean)
      .find(news => news && news.id === newsId)

    return target || null
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setErrorText('')

      let target = getCachedItem(id)

      if (!target) {
        try {
          const res = await Taro.cloud.callFunction({
            name: 'getNewsData',
            data: {
              action: 'list',
              limit: 10,
            }
          })
          const result = res.result as any
          if (result && result.success && Array.isArray(result.data)) {
            const nextList = result.data
              .map(news => normalizeNewsItem(news))
              .filter(Boolean) as NewsItem[]
            Taro.setStorageSync(NEWS_LIST_CACHE_KEY, nextList)
            target = nextList.find(news => news.id === id) || null
          }
        } catch (error) {
          console.error('补拉新闻列表失败', error)
        }
      }

      if (!target) {
        setLoading(false)
        setErrorText('未找到对应资讯')
        return
      }

      setItem(target)
      setContent(target.content)

      if (!target.url) {
        setLoading(false)
        return
      }

      try {
        const detailCache = Taro.getStorageSync(NEWS_DETAIL_CACHE_KEY) || {}
        if (detailCache[target.url] && Array.isArray(detailCache[target.url].content)) {
          const cachedDetail = detailCache[target.url]
          setContent(cachedDetail.content)
          setLoading(false)
          return
        }

        const res = await Taro.cloud.callFunction({
          name: 'getNewsData',
          data: {
            action: 'detail',
            url: target.url,
          }
        })

        const result = res.result as any
        if (result && result.success && result.data) {
          const nextContent = Array.isArray(result.data.content) && result.data.content.length
            ? result.data.content
            : target.content

          setContent(nextContent)
          Taro.setStorageSync(NEWS_DETAIL_CACHE_KEY, {
            ...detailCache,
            [target.url]: {
              content: nextContent,
            }
          })
        }
      } catch (error) {
        console.error('加载新闻详情失败', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [getCachedItem, id])

  if (!item) {
    return (
      <View className='news-detail news-detail-status'>
        <Text className='status-text'>{errorText || '资讯不存在'}</Text>
      </View>
    )
  }

  return (
    <View className='news-detail'>
      <Text className='title'>{item.title}</Text>
      <View className='meta'>
        <Text className='meta-item'>{item.time}</Text>
        <Text className='meta-item'>{item.source}</Text>
      </View>
      <View className='content'>
        {loading && (
          <Text className='status-text'>正在加载正文...</Text>
        )}
        {!loading && content.length === 0 && (
          <Text className='status-text'>暂无正文内容</Text>
        )}
        {content.map((paragraph, index) => (
          <Text key={`${item.id}-${index}`} className='paragraph'>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  )
}

export default NewsDetail
