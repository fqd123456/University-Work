import { Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { MartyrRecord } from '../../types'
import './index.scss'

type SearchResult = {
  success?: boolean
  message?: string
  data?: {
    list?: MartyrRecord[]
    pagination?: {
      total?: number
    }
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const buildCardMeta = (item: MartyrRecord) => {
  return item.address || item.nativePlace || `${item.city}${item.district}`
}

const MartyrDirectoryResult = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const keyword = router && router.params && router.params.keyword ? decodeURIComponent(router.params.keyword) : ''
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : ''
  const province = router && router.params && router.params.province ? decodeURIComponent(router.params.province) : ''
  const city = router && router.params && router.params.city ? decodeURIComponent(router.params.city) : ''
  const district = router && router.params && router.params.district ? decodeURIComponent(router.params.district) : ''
  const regionLabel = router && router.params && router.params.regionLabel ? decodeURIComponent(router.params.regionLabel) : ''

  const [list, setList] = useState<MartyrRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: '查询结果',
    })
  }, [])

  const loadResult = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'searchMartyrDirectory',
        data: {
          keyword,
          regionId,
          province,
          city,
          district,
          page: 1,
          pageSize: 50,
        },
      })
      const result = res.result as SearchResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '查询失败')
      }

      setList(result.data.list || [])
      setTotal(result.data.pagination && result.data.pagination.total ? result.data.pagination.total : 0)
    } catch (error) {
      console.error('加载烈士查询结果失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadResult()
  }, [city, district, keyword, province, regionId])

  const goToDetail = (item: MartyrRecord) => {
    if (!item._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/MartyrsDirectory/page/Detail/index?martyrId=${item._id}`,
    })
  }

  return (
    <View className='martyr-result-page'>
      <View className='martyr-result-hero'>
        <Text className='martyr-result-tag'>查询结果</Text>
        <Text className='martyr-result-title'>{keyword ? `“${keyword}” 的查询结果` : '地区英名录查询结果'}</Text>
        <Text className='martyr-result-desc'>{regionLabel || `${province}${city}${district}`}</Text>
        <Text className='martyr-result-count'>共找到 {total} 位烈士</Text>
      </View>

      {loading && (
        <LightLoading text='正在整理查询结果...' />
      )}

      {!loading && errorText && (
        <View className='martyr-result-status-card martyr-result-status-card-error' onClick={loadResult}>
          <Text className='martyr-result-status-title'>加载失败</Text>
          <Text className='martyr-result-status-desc'>{errorText}</Text>
          <Text className='martyr-result-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {list.length ? (
            <View className='martyr-result-list'>
              {list.map((item) => (
                <View
                  key={item._id || item.name}
                  className='martyr-result-card'
                  onClick={() => goToDetail(item)}
                >
                  <Text className='martyr-result-name'>{item.name}</Text>
                  <Text className='martyr-result-years'>{item.lifespan}</Text>
                  <Text className='martyr-result-address'>{buildCardMeta(item)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className='martyr-result-empty-card'>
              <Text className='martyr-result-empty-title'>未找到符合条件的烈士记录</Text>
              <Text className='martyr-result-empty-desc'>可以返回上一页调整姓名关键字或地区筛选条件。</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export default MartyrDirectoryResult
