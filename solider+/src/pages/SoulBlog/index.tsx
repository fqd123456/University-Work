import { Image, Input, Text, View } from '@tarojs/components'
import { useCallback, useRef, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { ensureLoggedIn } from '../../utils/auth'
import { SoulBlogArticle, SoulBlogCategory, SoulBlogHomeData, SoulBlogProfile } from './types'
import './index.scss'

type HomeResult = {
  success?: boolean
  message?: string
  data?: SoulBlogHomeData
}

type SaveProfileResult = {
  success?: boolean
  message?: string
  data?: SoulBlogProfile
}

type SaveCategoryResult = {
  success?: boolean
  message?: string
  data?: SoulBlogCategory
}

type ValueInputEvent = {
  detail: {
    value: string
  }
}

type DatasetEvent = {
  currentTarget: {
    dataset: Record<string, string | undefined>
  }
}

const initialProfile: SoulBlogProfile = {
  userId: '',
  displayName: '退役军人',
  avatarUrl: '',
  motto: '把走过的路，写成照亮后来人的光。',
}

const initialHomeData: SoulBlogHomeData = {
  profile: initialProfile,
  categories: [],
  recentArticles: [],
  stats: {
    articleCount: 0,
    categoryCount: 0,
    totalWords: 0,
  },
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const getInitials = (value: string) => {
  const nextValue = `${value || ''}`.trim()

  if (!nextValue) {
    return '军'
  }

  return nextValue.slice(0, 1)
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

const sortCategories = (categories: SoulBlogCategory[]) => {
  return [...categories].sort((prev, next) => {
    if (prev.sortOrder !== next.sortOrder) {
      return prev.sortOrder - next.sortOrder
    }

    return `${prev.name || ''}`.localeCompare(`${next.name || ''}`, 'zh-CN')
  })
}

const categoryToneClassNames = [
  'soul-category-card-tone-1',
  'soul-category-card-tone-2',
  'soul-category-card-tone-3',
  'soul-category-card-tone-4',
  'soul-category-card-tone-5',
  'soul-category-card-tone-6',
]

const getCategoryToneClass = (index: number) => {
  return categoryToneClassNames[Math.abs(index) % categoryToneClassNames.length]
}

const SoulBlog = () => {
  const [pageData, setPageData] = useState<SoulBlogHomeData>(initialHomeData)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [savingMotto, setSavingMotto] = useState(false)
  const [editingMotto, setEditingMotto] = useState(false)
  const [mottoInput, setMottoInput] = useState(initialProfile.motto)
  const [editingCategory, setEditingCategory] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  const keywordRef = useRef('')
  const profileMottoRef = useRef(initialProfile.motto)
  const mottoInputRef = useRef(initialProfile.motto)
  const categoryInputRef = useRef('')
  const editingMottoRef = useRef(false)
  const editingCategoryRef = useRef(false)
  const savingMottoRef = useRef(false)
  const savingCategoryRef = useRef(false)

  const loadPageData = useCallback(async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getSoulBlogHomeData',
      })
      const result = res.result as HomeResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取军魂记录数据失败')
      }

      const nextProfileMotto = result.data.profile.motto || ''

      setPageData({
        ...result.data,
        categories: sortCategories(result.data.categories || []),
      })

      profileMottoRef.current = nextProfileMotto

      if (!editingMottoRef.current) {
        mottoInputRef.current = nextProfileMotto
        setMottoInput(nextProfileMotto)
      }
    } catch (error) {
      console.error('加载军魂记录数据失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    const passed = ensureLoggedIn({ redirect: true })
    setAuthorized(passed)

    if (!passed) {
      setPageData(initialHomeData)
      setKeyword('')
      setErrorText('')
      setLoading(false)
      setEditingMotto(false)
      setEditingCategory(false)
      return
    }

    void loadPageData()
  })

  const handleKeywordInput = useCallback((event: ValueInputEvent) => {
    const nextKeyword = event.detail.value || ''
    keywordRef.current = nextKeyword
    setKeyword(nextKeyword)
  }, [])

  const handleMottoInput = useCallback((event: ValueInputEvent) => {
    const nextMotto = event.detail.value || ''
    mottoInputRef.current = nextMotto
    setMottoInput(nextMotto)
  }, [])

  const handleCategoryInput = useCallback((event: ValueInputEvent) => {
    const nextCategory = event.detail.value || ''
    categoryInputRef.current = nextCategory
    setCategoryInput(nextCategory)
  }, [])

  const handleSearch = useCallback(() => {
    const nextKeyword = `${keywordRef.current || ''}`.trim()

    if (!nextKeyword) {
      Taro.showToast({
        title: '请输入搜索关键词',
        icon: 'none',
      })
      return
    }

    Taro.navigateTo({
      url: `/pages/SoulBlog/page/Search/index?keyword=${encodeURIComponent(nextKeyword)}`,
    })
  }, [])

  const handleClearSearch = useCallback(() => {
    keywordRef.current = ''
    setKeyword('')
  }, [])

  const handleSaveMotto = useCallback(async () => {
    if (savingMottoRef.current) {
      return
    }

    const nextMotto = `${mottoInputRef.current || ''}`.trim()

    if (!nextMotto) {
      Taro.showToast({
        title: '请输入座右铭',
        icon: 'none',
      })
      return
    }

    savingMottoRef.current = true
    setSavingMotto(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'saveSoulBlogProfile',
        data: {
          motto: nextMotto,
        },
      })
      const result = res.result as SaveProfileResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '保存座右铭失败')
      }

      const nextProfile = result.data
      const nextProfileMotto = nextProfile.motto || nextMotto

      profileMottoRef.current = nextProfileMotto
      mottoInputRef.current = nextProfileMotto
      editingMottoRef.current = false

      setPageData((current) => ({
        ...current,
        profile: nextProfile || current.profile,
      }))
      setMottoInput(nextProfileMotto)
      setEditingMotto(false)
      Taro.showToast({
        title: '已保存',
        icon: 'success',
      })
    } catch (error) {
      console.error('保存座右铭失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      savingMottoRef.current = false
      setSavingMotto(false)
    }
  }, [])

  const handleStartEditMotto = useCallback(() => {
    const currentMotto = profileMottoRef.current || ''
    mottoInputRef.current = currentMotto
    editingMottoRef.current = true
    setMottoInput(currentMotto)
    setEditingMotto(true)
  }, [])

  const handleCancelMotto = useCallback(() => {
    const currentMotto = profileMottoRef.current || ''
    mottoInputRef.current = currentMotto
    editingMottoRef.current = false
    setMottoInput(currentMotto)
    setEditingMotto(false)
  }, [])

  const handleSaveMottoClick = useCallback(() => {
    void handleSaveMotto()
  }, [handleSaveMotto])

  const handleSaveCategory = useCallback(async () => {
    if (savingCategoryRef.current) {
      return
    }

    const nextCategoryName = `${categoryInputRef.current || ''}`.trim()

    if (!nextCategoryName) {
      Taro.showToast({
        title: '请输入分类名称',
        icon: 'none',
      })
      return
    }

    savingCategoryRef.current = true
    setSavingCategory(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'saveSoulBlogCategory',
        data: {
          name: nextCategoryName,
        },
      })
      const result = res.result as SaveCategoryResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '保存分类失败')
      }

      const savedCategory = result.data

      setPageData((current) => {
        const existed = current.categories.find((item) => item._id === savedCategory._id || item.name === savedCategory.name)
        const nextCategories = existed
          ? current.categories.map((item) => (item._id === savedCategory._id || item.name === savedCategory.name ? { ...item, ...savedCategory } : item))
          : [...current.categories, savedCategory]

        return {
          ...current,
          categories: sortCategories(nextCategories),
          stats: {
            ...current.stats,
            categoryCount: nextCategories.length,
          },
        }
      })

      categoryInputRef.current = ''
      editingCategoryRef.current = false
      setCategoryInput('')
      setEditingCategory(false)
      Taro.showToast({
        title: '分类已保存',
        icon: 'success',
      })
    } catch (error) {
      console.error('保存分类失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      savingCategoryRef.current = false
      setSavingCategory(false)
    }
  }, [])

  const handleToggleCategoryEditor = useCallback(() => {
    if (editingCategoryRef.current) {
      categoryInputRef.current = ''
      editingCategoryRef.current = false
      setCategoryInput('')
      setEditingCategory(false)
      return
    }

    editingCategoryRef.current = true
    setEditingCategory(true)
  }, [])

  const handleCancelCategory = useCallback(() => {
    categoryInputRef.current = ''
    editingCategoryRef.current = false
    setCategoryInput('')
    setEditingCategory(false)
  }, [])

  const handleSaveCategoryClick = useCallback(() => {
    void handleSaveCategory()
  }, [handleSaveCategory])

  const navigateToEditor = useCallback(() => {
    Taro.navigateTo({
      url: '/pages/SoulBlog/page/Editor/index',
    })
  }, [])

  const navigateToCategory = useCallback((categoryId: string, categoryName: string, toneIndex = '0') => {
    Taro.navigateTo({
      url: `/pages/SoulBlog/page/Category/index?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}&toneIndex=${toneIndex}`,
    })
  }, [])

  const navigateToArticleDetail = useCallback((articleId: string) => {
    if (!articleId) {
      return
    }

    Taro.navigateTo({
      url: `/pages/SoulBlog/page/ArticleDetail/index?articleId=${articleId}`,
    })
  }, [])

  const handleRetryLoad = useCallback(() => {
    void loadPageData()
  }, [loadPageData])

  const handleCategoryCardClick = useCallback((event: DatasetEvent) => {
    const { categoryId, categoryName, toneIndex } = event.currentTarget.dataset
    navigateToCategory(categoryId || '', categoryName || '', toneIndex || '0')
  }, [navigateToCategory])

  const handleArticleCardClick = useCallback((event: DatasetEvent) => {
    const { articleId } = event.currentTarget.dataset
    navigateToArticleDetail(articleId || '')
  }, [navigateToArticleDetail])

  if (!authorized) {
    return <View className='soul-page' />
  }

  if (loading) {
    return (
      <View className='soul-page'>
        <View className='soul-loading-wrap'>
          <View className='soul-loading-spinner' />
          <Text className='soul-loading-text'>正在加载</Text>
        </View>
      </View>
    )
  }

  if (errorText) {
    return (
      <View className='soul-page'>
        <View className='soul-loading-wrap'>
          <View className='soul-loading-spinner soul-loading-spinner-error' />
          <Text className='soul-loading-text'>加载失败</Text>
          <View className='soul-loading-retry' onClick={handleRetryLoad}>
            <Text>点击重试</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='soul-page'>
      <View className='soul-profile-card'>
        <View className='soul-profile-main'>
          {pageData.profile.avatarUrl ? (
            <Image className='soul-profile-avatar' src={pageData.profile.avatarUrl} mode='aspectFill' />
          ) : (
            <View className='soul-profile-avatar soul-profile-avatar-fallback'>
              <Text className='soul-profile-avatar-text'>{getInitials(pageData.profile.displayName)}</Text>
            </View>
          )}

          <View className='soul-profile-copy'>
            <Text className='soul-profile-name'>{pageData.profile.displayName}</Text>
            {!editingMotto ? (
              <View key='motto-view' className='soul-profile-motto-row'>
                <Text className='soul-profile-subtitle'>{pageData.profile.motto}</Text>
                <View className='soul-motto-edit-trigger soul-motto-edit-trigger-inline' onClick={handleStartEditMotto}>
                  <Text className='soul-motto-edit-icon'>✎</Text>
                </View>
              </View>
            ) : (
              <View key='motto-editor' className='soul-profile-motto-editor'>
                <Input
                  className='soul-motto-inline-input'
                  value={mottoInput}
                  maxlength={40}
                  placeholder='写一句属于自己的座右铭'
                  onInput={handleMottoInput}
                />
                <View className='soul-inline-action-row'>
                  <View className='soul-inline-action soul-inline-action-muted' onClick={handleCancelMotto}>
                    <Text>取消</Text>
                  </View>
                  <View
                    className={`soul-inline-action soul-inline-action-primary ${savingMotto ? 'soul-inline-action-disabled' : ''}`}
                    onClick={handleSaveMottoClick}
                  >
                    <Text>{savingMotto ? '保存中' : '保存'}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View className='soul-stat-grid'>
          <View className='soul-stat-card'>
            <Text className='soul-stat-value'>{pageData.stats.articleCount}</Text>
            <Text className='soul-stat-label'>文章</Text>
          </View>
          <View className='soul-stat-card'>
            <Text className='soul-stat-value'>{pageData.stats.categoryCount}</Text>
            <Text className='soul-stat-label'>分类</Text>
          </View>
          <View className='soul-stat-card'>
            <Text className='soul-stat-value'>{pageData.stats.totalWords}</Text>
            <Text className='soul-stat-label'>字数</Text>
          </View>
        </View>
      </View>

      <View className='soul-search-panel'>
        <View className='soul-search-bar'>
          <View className='soul-search-card'>
            <Text className='soul-search-icon'>搜</Text>
            <Input
              className='soul-search-input'
              value={keyword}
              placeholder='搜索标题、分类或正文内容'
              confirmType='search'
              onInput={handleKeywordInput}
              onConfirm={handleSearch}
            />
            {keyword ? (
              <View className='soul-search-clear' onClick={handleClearSearch}>
                <Text>清空</Text>
              </View>
            ) : null}
            <View className='soul-search-action' onClick={handleSearch}>
              <Text>搜索</Text>
            </View>
          </View>
          <View className='soul-add-btn soul-add-btn-search' onClick={navigateToEditor}>
            <Text className='soul-add-btn-text'>+</Text>
          </View>
        </View>
      </View>

      <View className='soul-section-head'>
        <View className='soul-section-title-row'>
          <Text className='soul-section-title'>我的分类</Text>
          <View className='soul-section-icon-btn' onClick={handleToggleCategoryEditor}>
            <Text>+</Text>
          </View>
        </View>
        <Text className='soul-section-count'>{pageData.categories.length} 个</Text>
      </View>

      {editingCategory ? (
        <View key='category-editor' className='soul-category-editor'>
          <Input
            className='soul-category-input'
            value={categoryInput}
            maxlength={12}
            placeholder='输入新的分类名称'
            onInput={handleCategoryInput}
          />
          <View className='soul-inline-action-row'>
            <View className='soul-inline-action soul-inline-action-muted' onClick={handleCancelCategory}>
              <Text>取消</Text>
            </View>
            <View
              className={`soul-inline-action soul-inline-action-primary ${savingCategory ? 'soul-inline-action-disabled' : ''}`}
              onClick={handleSaveCategoryClick}
            >
              <Text>{savingCategory ? '保存中' : '保存分类'}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View className='soul-category-grid'>
        {pageData.categories.map((category, index) => (
          <View
            key={category._id || `${category.name}-${category.sortOrder}`}
            className={`soul-category-card ${getCategoryToneClass(index)}`}
            data-category-id={category._id || ''}
            data-category-name={category.name || ''}
            data-tone-index={`${index}`}
            onClick={handleCategoryCardClick}
          >
            <Text className='soul-category-name'>{category.name}</Text>
            <Text className='soul-category-count'>{category.articleCount} 篇文章</Text>
          </View>
        ))}
      </View>

      <View className='soul-section-head soul-section-head-articles'>
        <Text className='soul-section-title'>最新记录</Text>
        <Text className='soul-section-count'>{pageData.recentArticles.length} 篇</Text>
      </View>

      {pageData.recentArticles.length ? (
        <View className='soul-article-list'>
          {pageData.recentArticles.map((article) => (
            <View
              key={article._id || article.title}
              className='soul-article-card'
              data-article-id={article._id || ''}
              onClick={handleArticleCardClick}
            >
              <View className='soul-article-cover'>
                {article.coverImage ? (
                  <Image className='soul-article-cover-image' src={article.coverImage} mode='aspectFill' />
                ) : (
                  <View className='soul-article-cover-fallback'>
                    <Text className='soul-article-cover-tag'>{article.categoryName}</Text>
                    <Text className='soul-article-cover-date'>{getArticleDate(article)}</Text>
                  </View>
                )}
              </View>

              <View className='soul-article-body'>
                <View className='soul-article-top'>
                  <Text className='soul-article-category'>{article.categoryName}</Text>
                  <Text className='soul-article-time'>{getArticleDate(article)}</Text>
                </View>
                <Text className='soul-article-title'>{article.title}</Text>
                <Text className='soul-article-summary'>{getArticlePreview(article)}</Text>
                <View className='soul-article-foot'>
                  <Text className='soul-article-meta'>{article.viewCount || 0} 次阅读</Text>
                  <Text className='soul-article-link'>查看详情</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className='soul-empty-card'>
          <Text className='soul-empty-title'>还没有发布文章</Text>
          <Text className='soul-empty-desc'>点击右上角加号，写下你的第一篇军魂记录。</Text>
          <View className='soul-empty-action' onClick={navigateToEditor}>
            <Text>立即写文章</Text>
          </View>
        </View>
      )}
    </View>
  )
}

export default SoulBlog
