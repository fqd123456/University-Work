import { Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { SoulBlogArticle } from '../../types'
import './index.scss'

type ArticleListResult = {
  success?: boolean
  message?: string
  data?: {
    list?: SoulBlogArticle[]
  }
}

const categoryToneClassNames = [
  'soul-category-card-tone-1',
  'soul-category-card-tone-2',
  'soul-category-card-tone-3',
  'soul-category-card-tone-4',
  'soul-category-card-tone-5',
  'soul-category-card-tone-6',
]

const getCategoryToneClass = (name: string, toneIndex?: string) => {
  const parsedToneIndex = Number.parseInt(`${toneIndex || ''}`, 10)

  if (!Number.isNaN(parsedToneIndex) && parsedToneIndex >= 0) {
    return categoryToneClassNames[parsedToneIndex % categoryToneClassNames.length]
  }

  const nextName = `${name || ''}`
  let hash = 0

  for (let index = 0; index < nextName.length; index += 1) {
    hash = (hash << 5) - hash + nextName.charCodeAt(index)
    hash |= 0
  }

  return categoryToneClassNames[Math.abs(hash) % categoryToneClassNames.length]
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const getArticleDate = (article: SoulBlogArticle) => {
  return article.updatedAt || article.publishedAt || article.createdAt || ''
}

const SoulBlogCategoryPage = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const categoryId = router && router.params && router.params.categoryId ? router.params.categoryId : ''
  const categoryNameParam = router && router.params && router.params.categoryName ? decodeURIComponent(router.params.categoryName) : ''
  const toneIndexParam = router && router.params && router.params.toneIndex ? router.params.toneIndex : ''

  const [categoryName, setCategoryName] = useState(categoryNameParam)
  const [articles, setArticles] = useState<SoulBlogArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadArticles = async () => {
    if (!categoryId) {
      setLoading(false)
      setErrorText('未找到分类信息')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getSoulBlogArticles',
        data: {
          categoryId,
          page: 1,
          pageSize: 50,
        },
      })
      const result = res.result as ArticleListResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取分类文章失败')
      }

      const nextArticles = result.data.list || []
      setArticles(nextArticles)

      if (!categoryName && nextArticles.length && nextArticles[0].categoryName) {
        setCategoryName(nextArticles[0].categoryName)
      }
    } catch (error) {
      console.error('加载分类文章失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadArticles()
  })

  useEffect(() => {
    if (categoryName) {
      Taro.setNavigationBarTitle({
        title: categoryName,
      })
    }
  }, [categoryName])

  const goPublish = () => {
    Taro.navigateTo({
      url: `/pages/SoulBlog/page/Editor/index?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName || '')}`,
    })
  }

  const goDetail = (article: SoulBlogArticle) => {
    if (!article._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/SoulBlog/page/ArticleDetail/index?articleId=${article._id}`,
    })
  }

  return (
    <View className='soul-category-page'>
      <View className={`soul-category-hero ${getCategoryToneClass(categoryName || '', toneIndexParam)}`}>
        <View className='soul-category-hero-head'>
          <Text className='soul-category-title'>{categoryName || '分类内容'}</Text>
          <Text className='soul-category-count'>{articles.length} 篇文章</Text>
        </View>
      </View>

      {loading && (
        <LightLoading text='正在获取分类文章...' />
      )}

      {!loading && errorText && (
        <View className='soul-category-status-card soul-category-status-card-error' onClick={loadArticles}>
          <Text className='soul-category-status-title'>加载失败</Text>
          <Text className='soul-category-status-desc'>{errorText}</Text>
          <Text className='soul-category-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {articles.length ? (
            <View className='soul-category-list'>
              {articles.map((article) => (
                <View
                  key={article._id || article.title}
                  className='soul-category-article-card'
                  onClick={() => goDetail(article)}
                >
                  <Text className='soul-category-article-title'>{article.title}</Text>
                  <Text className='soul-category-article-summary'>{article.summary || `${article.plainText || ''}`.slice(0, 80)}</Text>
                  <View className='soul-category-article-foot'>
                    <Text className='soul-category-article-time'>{getArticleDate(article)}</Text>
                    <Text className='soul-category-article-link'>查看详情</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='soul-category-empty-card'>
              <Text className='soul-category-empty-title'>这个分类还没有文章</Text>
              <Text className='soul-category-empty-desc'>可以直接在当前分类下发布一篇新的内容。</Text>
              <Text className='soul-category-empty-action' onClick={goPublish}>去写文章</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export default SoulBlogCategoryPage
