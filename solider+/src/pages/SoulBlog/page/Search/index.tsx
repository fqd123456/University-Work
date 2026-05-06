import { Image, Input, Text, View } from '@tarojs/components'
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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const getArticlePreview = (article: SoulBlogArticle) => {
  if (article.summary) {
    return article.summary
  }

  return `${article.plainText || ''}`.slice(0, 80)
}

const getArticleDate = (article: SoulBlogArticle) => {
  return article.updatedAt || article.publishedAt || article.createdAt || ''
}

const SoulBlogSearchPage = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const initialKeyword = router && router.params && router.params.keyword ? decodeURIComponent(router.params.keyword) : ''

  const [keyword, setKeyword] = useState(initialKeyword)
  const [articles, setArticles] = useState<SoulBlogArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [errorText, setErrorText] = useState('')

  const loadArticles = async (silent?: boolean) => {
    const nextKeyword = `${keyword || ''}`.trim()

    if (!nextKeyword) {
      setArticles([])
      setLoading(false)
      setSearching(false)
      setErrorText('')
      return
    }

    if (silent) {
      setLoading(true)
    } else {
      setSearching(true)
    }
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getSoulBlogArticles',
        data: {
          keyword: nextKeyword,
          page: 1,
          pageSize: 50,
        },
      })
      const result = res.result as ArticleListResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '搜索文章失败')
      }

      setArticles(result.data.list || [])
    } catch (error) {
      console.error('搜索军魂记录失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  useDidShow(() => {
    void loadArticles(true)
  })

  useEffect(() => {
    const nextKeyword = `${keyword || ''}`.trim()

    Taro.setNavigationBarTitle({
      title: nextKeyword ? `搜索:${nextKeyword.slice(0, 6)}` : '搜索结果',
    })
  }, [keyword])

  const handleSearch = () => {
    const nextKeyword = `${keyword || ''}`.trim()

    if (!nextKeyword) {
      Taro.showToast({
        title: '请输入搜索关键词',
        icon: 'none',
      })
      return
    }

    void loadArticles()
  }

  const handleClear = () => {
    setKeyword('')
    setArticles([])
    setErrorText('')
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
    <View className='soul-search-page'>
      <View className='soul-search-result-bar'>
        <Text className='soul-search-result-icon'>搜</Text>
        <Input
          className='soul-search-result-input'
          value={keyword}
          placeholder='搜索标题、分类或正文内容'
          confirmType='search'
          onInput={(event) => setKeyword(event.detail.value)}
          onConfirm={handleSearch}
        />
        {keyword ? (
          <Text className='soul-search-result-clear' onClick={handleClear}>清空</Text>
        ) : null}
        <Text
          className={`soul-search-result-action ${searching ? 'soul-search-result-action-disabled' : ''}`}
          onClick={() => {
            if (!searching) {
              handleSearch()
            }
          }}
        >
          {searching ? '搜索中' : '搜索'}
        </Text>
      </View>

      <View className='soul-search-result-head'>
        <Text className='soul-search-result-title'>搜索结果</Text>
        <Text className='soul-search-result-count'>{articles.length} 篇</Text>
      </View>

      {loading && (
        <LightLoading text='正在查找与你关键词相关的文章...' />
      )}

      {!loading && errorText && (
        <View className='soul-search-status-card soul-search-status-card-error' onClick={() => { void loadArticles(true) }}>
          <Text className='soul-search-status-title'>搜索失败</Text>
          <Text className='soul-search-status-desc'>{errorText}</Text>
          <Text className='soul-search-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && articles.length ? (
        <View className='soul-search-list'>
          {articles.map((article) => (
            <View
              key={article._id || article.title}
              className='soul-search-article-card'
              onClick={() => goDetail(article)}
            >
              <View className='soul-search-article-cover'>
                {article.coverImage ? (
                  <Image className='soul-search-article-cover-image' src={article.coverImage} mode='aspectFill' />
                ) : (
                  <View className='soul-search-article-cover-fallback'>
                    <Text className='soul-search-article-cover-tag'>{article.categoryName}</Text>
                    <Text className='soul-search-article-cover-date'>{getArticleDate(article)}</Text>
                  </View>
                )}
              </View>

              <View className='soul-search-article-body'>
                <View className='soul-search-article-top'>
                  <Text className='soul-search-article-category'>{article.categoryName}</Text>
                  <Text className='soul-search-article-time'>{getArticleDate(article)}</Text>
                </View>
                <Text className='soul-search-article-title'>{article.title}</Text>
                <Text className='soul-search-article-summary'>{getArticlePreview(article)}</Text>
                <View className='soul-search-article-foot'>
                  <Text className='soul-search-article-meta'>{article.viewCount || 0} 次阅读</Text>
                  <Text className='soul-search-article-link'>查看详情</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {!loading && !errorText && !articles.length ? (
        <View className='soul-search-empty-card'>
          <Text className='soul-search-empty-title'>{`${keyword || ''}`.trim() ? '没有找到相关内容' : '输入关键词开始搜索'}</Text>
          <Text className='soul-search-empty-desc'>
            {`${keyword || ''}`.trim() ? '可以换一个关键词试试，也可以返回首页查看最新记录。' : '支持搜索标题、分类和正文内容。'}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default SoulBlogSearchPage
