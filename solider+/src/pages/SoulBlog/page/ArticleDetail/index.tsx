import { RichText, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { SoulBlogArticle } from '../../types'
import './index.scss'

type DetailResult = {
  success?: boolean
  message?: string
  data?: {
    article?: SoulBlogArticle
    relatedArticles?: SoulBlogArticle[]
  }
}

type DeleteResult = {
  success?: boolean
  message?: string
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const getArticleDate = (article?: SoulBlogArticle | null) => {
  if (!article) {
    return ''
  }

  return article.updatedAt || article.publishedAt || article.createdAt || ''
}

const SoulBlogArticleDetail = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const articleId = router && router.params && router.params.articleId ? router.params.articleId : ''

  const [article, setArticle] = useState<SoulBlogArticle | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<SoulBlogArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const loadDetail = async () => {
    if (!articleId) {
      setLoading(false)
      setErrorText('未找到文章信息')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getSoulBlogArticleDetail',
        data: {
          articleId,
        },
      })
      const result = res.result as DetailResult

      if (!result || !result.success || !result.data || !result.data.article) {
        throw new Error(result && result.message ? result.message : '获取文章详情失败')
      }

      setArticle(result.data.article)
      setRelatedArticles(result.data.relatedArticles || [])
    } catch (error) {
      console.error('加载文章详情失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadDetail()
  })

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: '文章详情',
    })
  }, [])

  const goEdit = () => {
    if (!article || !article._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/SoulBlog/page/Editor/index?articleId=${article._id}`,
    })
  }

  const goDetail = (nextArticle: SoulBlogArticle) => {
    if (!nextArticle._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/SoulBlog/page/ArticleDetail/index?articleId=${nextArticle._id}`,
    })
  }

  const handleDelete = async () => {
    if (!article || !article._id || deleting) {
      return
    }

    const modalRes = await Taro.showModal({
      title: '删除文章',
      content: '确定删除这篇文章吗？删除后不可恢复。',
      confirmText: '删除',
      cancelText: '取消',
    })

    if (!modalRes.confirm) {
      return
    }

    setDeleting(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'deleteSoulBlogArticle',
        data: {
          articleId: article._id,
        },
      })
      const result = res.result as DeleteResult

      if (!result || !result.success) {
        throw new Error(result && result.message ? result.message : '删除失败')
      }

      Taro.showToast({
        title: '已删除',
        icon: 'success',
      })

      setTimeout(() => {
        Taro.navigateBack({ delta: 1 }).catch(() => {
          Taro.redirectTo({
            url: '/pages/SoulBlog/index',
          })
        })
      }, 320)
    } catch (error) {
      console.error('删除文章失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <View className='soul-detail-page'>
      {loading && (
        <LightLoading text='正在获取文章详情...' />
      )}

      {!loading && errorText && (
        <View className='soul-detail-status-card soul-detail-status-card-error' onClick={loadDetail}>
          <Text className='soul-detail-status-title'>加载失败</Text>
          <Text className='soul-detail-status-desc'>{errorText}</Text>
          <Text className='soul-detail-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && article && (
        <>
          <View className='soul-detail-hero'>
            <View className='soul-detail-title-row'>
              <Text className='soul-detail-title'>{article.title}</Text>
              <View className='soul-detail-title-actions'>
                <View className='soul-detail-icon-btn' onClick={goEdit}>
                  <Text className='soul-detail-icon'>✎</Text>
                </View>
                <View
                  className={`soul-detail-icon-btn soul-detail-icon-btn-danger ${deleting ? 'soul-detail-icon-btn-disabled' : ''}`}
                  onClick={() => { void handleDelete() }}
                >
                  <Text className='soul-detail-icon'>⌫</Text>
                </View>
              </View>
            </View>
            <Text className='soul-detail-meta'>
              {getArticleDate(article)} · {article.viewCount || 0} 次阅读 · {article.categoryName}
            </Text>
          </View>

          <View className='soul-detail-content-card'>
            <RichText className='soul-detail-rich-text' nodes={article.contentHtml} />
          </View>

          {relatedArticles.length ? (
            <View className='soul-detail-related-section'>
              <View className='soul-detail-section-head'>
                <Text className='soul-detail-section-title'>同分类更多内容</Text>
              </View>
              <View className='soul-detail-related-list'>
                {relatedArticles.map((item) => (
                  <View
                    key={item._id || item.title}
                    className='soul-detail-related-card'
                    onClick={() => goDetail(item)}
                  >
                    <Text className='soul-detail-related-title'>{item.title}</Text>
                    <Text className='soul-detail-related-meta'>{getArticleDate(item)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  )
}

export default SoulBlogArticleDetail
