import { Editor, Input, Text, View } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { SoulBlogArticle, SoulBlogCategory, SoulBlogHomeData } from '../../types'
import './index.scss'

type HomeResult = {
  success?: boolean
  message?: string
  data?: SoulBlogHomeData
}

type DetailResult = {
  success?: boolean
  message?: string
  data?: {
    article?: SoulBlogArticle
  }
}

type SaveArticleResult = {
  success?: boolean
  message?: string
  data?: {
    articleId?: string
    isNew?: boolean
  }
}

type SaveCategoryResult = {
  success?: boolean
  message?: string
  data?: SoulBlogCategory
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '操作失败，请稍后重试'
}

const getFileExt = (filePath: string) => {
  const match = `${filePath || ''}`.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return match && match[1] ? match[1] : 'jpg'
}

const sortCategories = (categories: SoulBlogCategory[]) => {
  return [...categories].sort((left, right) => {
    return left.sortOrder - right.sortOrder
  })
}

const SoulBlogEditor = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const articleId = router && router.params && router.params.articleId ? router.params.articleId : ''
  const presetCategoryId = router && router.params && router.params.categoryId ? router.params.categoryId : ''
  const presetCategoryName = router && router.params && router.params.categoryName ? decodeURIComponent(router.params.categoryName) : ''

  const editorCtxRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [categories, setCategories] = useState<SoulBlogCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [showCategoryEditor, setShowCategoryEditor] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editorReady, setEditorReady] = useState(false)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [hasAppliedInitialContent, setHasAppliedInitialContent] = useState(false)
  const [initialContentHtml, setInitialContentHtml] = useState('<p><br></p>')
  const [editorHtml, setEditorHtml] = useState('')
  const [plainText, setPlainText] = useState('')
  const [imageList, setImageList] = useState<string[]>([])

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: articleId ? '编辑文章' : '发布文章',
    })
  }, [articleId])

  useEffect(() => {
    if (!editorReady || !initialDataLoaded || hasAppliedInitialContent || !editorCtxRef.current) {
      return
    }

    editorCtxRef.current.setContents({
      html: initialContentHtml || '<p><br></p>',
    })
    setEditorHtml(initialContentHtml || '')
    setHasAppliedInitialContent(true)
  }, [editorReady, hasAppliedInitialContent, initialContentHtml, initialDataLoaded])

  const loadPageData = async () => {
    setLoading(true)
    setInitialDataLoaded(false)
    setHasAppliedInitialContent(false)

    try {
      const requestList: Promise<any>[] = [
        Taro.cloud.callFunction({
          name: 'getSoulBlogHomeData',
        }),
      ]

      if (articleId) {
        requestList.push(
          Taro.cloud.callFunction({
            name: 'getSoulBlogArticleDetail',
            data: {
              articleId,
              trackView: false,
              resolveAssetUrls: false,
            },
          })
        )
      }

      const responseList = await Promise.all(requestList)
      const homeResult = responseList[0].result as HomeResult

      if (!homeResult || !homeResult.success || !homeResult.data) {
        throw new Error(homeResult && homeResult.message ? homeResult.message : '获取编辑数据失败')
      }

      const nextCategories = sortCategories(homeResult.data.categories || [])
      setCategories(nextCategories)

      if (articleId) {
        const detailResult = responseList[1].result as DetailResult

        if (!detailResult || !detailResult.success || !detailResult.data || !detailResult.data.article) {
          throw new Error(detailResult && detailResult.message ? detailResult.message : '获取文章详情失败')
        }

        const article = detailResult.data.article
        setTitle(article.title || '')
        setSelectedCategoryId(article.categoryId || '')
        setSelectedCategoryName(article.categoryName || '')
        setImageList(article.imageList || [])
        setPlainText(article.plainText || '')
        setInitialContentHtml(article.contentHtml || '<p><br></p>')
      } else {
        const matchedCategory = nextCategories.find((item) => item._id === presetCategoryId)
        const fallbackCategory = matchedCategory || (nextCategories.length ? nextCategories[0] : null)

        if (fallbackCategory) {
          setSelectedCategoryId(fallbackCategory._id || '')
          setSelectedCategoryName(fallbackCategory.name)
        } else if (presetCategoryName) {
          setSelectedCategoryName(presetCategoryName)
        }
      }

      setInitialDataLoaded(true)
    } catch (error) {
      console.error('加载文章编辑数据失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPageData()
  }, [articleId, presetCategoryId, presetCategoryName])

  const handleEditorReady = () => {
    Taro.createSelectorQuery()
      .select('#soul-editor-core')
      .context((res: any) => {
        if (res && res.context) {
          editorCtxRef.current = res.context
          setEditorReady(true)
        }
      })
      .exec()
  }

  const handleEditorChange = (event) => {
    const detail = event && event.detail ? event.detail : { html: '', text: '' }
    setEditorHtml(detail.html || '')
    setPlainText(detail.text || '')
  }

  const handleSelectCategory = (category: SoulBlogCategory) => {
    setSelectedCategoryId(category._id || '')
    setSelectedCategoryName(category.name)
  }

  const handleSaveCategory = async () => {
    const nextName = `${newCategoryName || ''}`.trim()

    if (!nextName) {
      Taro.showToast({
        title: '请输入分类名称',
        icon: 'none',
      })
      return
    }

    try {
      const res = await Taro.cloud.callFunction({
        name: 'saveSoulBlogCategory',
        data: {
          name: nextName,
        },
      })
      const result = res.result as SaveCategoryResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '新增分类失败')
      }

      const nextCategory = result.data
      const mergedCategories = sortCategories(
        [...categories.filter((item) => item._id !== nextCategory._id), nextCategory]
      )

      setCategories(mergedCategories)
      setSelectedCategoryId(nextCategory._id || '')
      setSelectedCategoryName(nextCategory.name)
      setNewCategoryName('')
      setShowCategoryEditor(false)
      Taro.showToast({
        title: '分类已新增',
        icon: 'success',
      })
    } catch (error) {
      console.error('新增文章分类失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    }
  }

  const handleUploadImages = async () => {
    if (!editorCtxRef.current || uploading) {
      return
    }

    setUploading(true)

    try {
      const chooseRes = await Taro.chooseMedia({
        count: 3,
        mediaType: ['image'],
        sizeType: ['compressed'],
      })
      const tempFiles = chooseRes && chooseRes.tempFiles ? chooseRes.tempFiles : []

      if (!tempFiles.length) {
        return
      }

      const uploadedFiles: string[] = []

      for (let index = 0; index < tempFiles.length; index += 1) {
        const fileItem = tempFiles[index]
        const filePath = fileItem && fileItem.tempFilePath ? fileItem.tempFilePath : ''

        if (!filePath) {
          continue
        }

        const ext = getFileExt(filePath)
        const cloudPath = `soul-blog/${Date.now()}_${index}.${ext}`
        const uploadRes = await Taro.cloud.uploadFile({
          cloudPath,
          filePath,
        })

        if (uploadRes && uploadRes.fileID) {
          uploadedFiles.push(uploadRes.fileID)
          editorCtxRef.current.insertImage({
            src: uploadRes.fileID,
            width: '100%',
            alt: '文章配图',
          })
        }
      }

      if (uploadedFiles.length) {
        setImageList((current) => Array.from(new Set(current.concat(uploadedFiles))))
      }
    } catch (error) {
      console.error('上传文章图片失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClearEditor = () => {
    if (!editorCtxRef.current) {
      return
    }

    editorCtxRef.current.clear()
    setEditorHtml('')
    setPlainText('')
    setImageList([])
  }

  const handleSaveArticle = async () => {
    if (saving) {
      return
    }

    const nextTitle = `${title || ''}`.trim()

    if (!nextTitle) {
      Taro.showToast({
        title: '请输入文章标题',
        icon: 'none',
      })
      return
    }

    if (!selectedCategoryId && !selectedCategoryName) {
      Taro.showToast({
        title: '请选择文章分类',
        icon: 'none',
      })
      return
    }

    setSaving(true)

    try {
      const res = await Taro.cloud.callFunction({
        name: 'saveSoulBlogArticle',
        data: {
          articleId,
          title: nextTitle,
          categoryId: selectedCategoryId,
          categoryName: selectedCategoryName,
          contentHtml: editorHtml,
          plainText,
          imageList,
        },
      })
      const result = res.result as SaveArticleResult

      if (!result || !result.success || !result.data || !result.data.articleId) {
        throw new Error(result && result.message ? result.message : '保存文章失败')
      }

      Taro.showToast({
        title: articleId ? '修改成功' : '发布成功',
        icon: 'success',
      })

      setTimeout(() => {
        if (articleId) {
          Taro.navigateBack({ delta: 1 })
          return
        }

        Taro.redirectTo({
          url: `/pages/SoulBlog/page/ArticleDetail/index?articleId=${result.data && result.data.articleId ? result.data.articleId : ''}`,
        })
      }, 320)
    } catch (error) {
      console.error('保存文章失败', error)
      Taro.showToast({
        title: getErrorMessage(error),
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='soul-editor-page'>
      {loading ? (
        <LightLoading text='正在准备编辑器...' />
      ) : (
        <>
          <View className='soul-editor-card'>
            <Text className='soul-editor-label'>文章标题</Text>
            <Input
              className='soul-editor-title-input'
              value={title}
              maxlength={40}
              placeholder='给这篇文章起一个标题'
              onInput={(event) => setTitle(event.detail.value)}
            />
          </View>

          <View className='soul-editor-card soul-editor-card-rich'>
            <View className='soul-editor-section-head'>
              <Text className='soul-editor-label'>正文内容</Text>
              <View className='soul-editor-toolbar'>
                <Text
                  className={`soul-editor-toolbar-btn ${uploading ? 'soul-editor-toolbar-btn-disabled' : ''}`}
                  onClick={() => {
                    if (!uploading) {
                      void handleUploadImages()
                    }
                  }}
                >
                  {uploading ? '上传中' : '插图'}
                </Text>
                <Text className='soul-editor-toolbar-btn soul-editor-toolbar-btn-muted' onClick={handleClearEditor}>清空</Text>
              </View>
            </View>

            <Editor
              id='soul-editor-core'
              className='soul-editor-core'
              placeholder='记录今天的训练、生活、感悟或新的目标...'
              showImgSize
              showImgToolbar
              showImgResize
              onReady={handleEditorReady}
              onInput={handleEditorChange}
              onBlur={handleEditorChange}
            />

            <Text className='soul-editor-tip'>支持输入富文本内容，并可上传图片插入正文中。</Text>
          </View>

          <View className='soul-editor-card'>
            <View className='soul-editor-section-head'>
              <Text className='soul-editor-label'>文章分类</Text>
              <Text className='soul-editor-secondary-action' onClick={() => setShowCategoryEditor((current) => !current)}>
                {showCategoryEditor ? '收起新增' : '新增分类'}
              </Text>
            </View>

            <View className='soul-editor-category-grid'>
              {categories.map((category) => (
                <View
                  key={category._id || category.name}
                  className={`soul-editor-category-chip ${selectedCategoryId === category._id ? 'soul-editor-category-chip-active' : ''}`}
                  onClick={() => handleSelectCategory(category)}
                >
                  <Text className={`soul-editor-category-chip-text ${selectedCategoryId === category._id ? 'soul-editor-category-chip-text-active' : ''}`}>
                    {category.name}
                  </Text>
                </View>
              ))}
            </View>

            {showCategoryEditor ? (
              <View className='soul-editor-inline-form'>
                <Input
                  className='soul-editor-inline-input'
                  value={newCategoryName}
                  maxlength={12}
                  placeholder='输入新的分类名称'
                  onInput={(event) => setNewCategoryName(event.detail.value)}
                />
                <Text className='soul-editor-inline-submit' onClick={() => { void handleSaveCategory() }}>保存分类</Text>
              </View>
            ) : null}
          </View>

          <View className='soul-editor-footer'>
            <Text className='soul-editor-footer-note'>发布后会同步到你的军魂记录首页与对应分类页面。</Text>
            <View className='soul-editor-submit-btn' onClick={() => { void handleSaveArticle() }}>
              <Text className='soul-editor-submit-text'>{saving ? '保存中...' : articleId ? '保存修改' : '发布文章'}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  )
}

export default SoulBlogEditor
