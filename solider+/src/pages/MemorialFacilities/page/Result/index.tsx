import { Image, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import LightLoading from '../../../../components/LightLoading'
import { MemorialFacility } from '../../types'
import './index.scss'

type SearchResult = {
  success?: boolean
  message?: string
  data?: {
    list?: MemorialFacility[]
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

const MemorialFacilitiesResult = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const keyword = router && router.params && router.params.keyword ? decodeURIComponent(router.params.keyword) : ''
  const regionId = router && router.params && router.params.regionId ? router.params.regionId : ''
  const province = router && router.params && router.params.province ? decodeURIComponent(router.params.province) : ''
  const city = router && router.params && router.params.city ? decodeURIComponent(router.params.city) : ''
  const district = router && router.params && router.params.district ? decodeURIComponent(router.params.district) : ''
  const regionLabel = router && router.params && router.params.regionLabel ? decodeURIComponent(router.params.regionLabel) : ''

  const [list, setList] = useState<MemorialFacility[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: '纪念设施结果',
    })
  }, [])

  const loadResult = async () => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'searchMemorialFacilities',
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
      console.error('加载纪念设施查询结果失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadResult()
  }, [city, district, keyword, province, regionId])

  const goToDetail = (item: MemorialFacility) => {
    if (!item._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/MemorialFacilities/page/Detail/index?facilityId=${item._id}`,
    })
  }

  return (
    <View className='memorial-result-page'>
      <View className='memorial-result-hero'>
        <Text className='memorial-result-tag'>查询结果</Text>
        <Text className='memorial-result-title'>{keyword ? `“${keyword}” 的查询结果` : '纪念设施查询结果'}</Text>
        <Text className='memorial-result-desc'>{regionLabel || `${province}${city}${district}`}</Text>
        <Text className='memorial-result-count'>共找到 {total} 处纪念设施</Text>
      </View>

      {loading && (
        <LightLoading text='正在整理查询结果...' />
      )}

      {!loading && errorText && (
        <View className='memorial-result-status-card memorial-result-status-card-error' onClick={loadResult}>
          <Text className='memorial-result-status-title'>加载失败</Text>
          <Text className='memorial-result-status-desc'>{errorText}</Text>
          <Text className='memorial-result-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {list.length ? (
            <View className='memorial-result-grid'>
              {list.map((item) => (
                <View
                  key={item._id || item.facilityName}
                  className='memorial-result-card'
                  onClick={() => goToDetail(item)}
                >
                  <View className='memorial-result-image-wrap'>
                    {item.coverImage ? (
                      <Image className='memorial-result-image' src={item.coverImage} mode='aspectFill' />
                    ) : (
                      <View className='memorial-result-image memorial-result-image-fallback'>
                        <Text className='memorial-result-image-fallback-text'>{item.facilityType}</Text>
                      </View>
                    )}
                  </View>
                  <View className='memorial-result-card-body'>
                    <Text className='memorial-result-name'>{item.facilityName}</Text>
                    <Text className='memorial-result-location'>{item.locationLabel || item.address}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='memorial-result-empty-card'>
              <Text className='memorial-result-empty-title'>未找到符合条件的纪念设施</Text>
              <Text className='memorial-result-empty-desc'>可以返回上一页调整名称关键字或地区筛选条件。</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export default MemorialFacilitiesResult
