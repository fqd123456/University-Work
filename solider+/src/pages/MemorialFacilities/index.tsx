import { Image, Input, Picker, Text, View } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import LightLoading from '../../components/LightLoading'
import locationStore from '../../store/location'
import {
  DEFAULT_DIRECTORY_REGION_ID,
  DEFAULT_DIRECTORY_REGION_TREE,
  findRegionSelectionByCity,
  findRegionSelectionByRegionId,
  getRegionPickerColumns,
  getRegionSelectionFromIndices,
  RegionProvinceOption,
  RegionSelection,
} from '../DirectoryShared/regionUtils'
import { MemorialFacilitiesHomeData, MemorialFacility } from './types'
import './index.scss'

type HomeResult = {
  success?: boolean
  message?: string
  data?: MemorialFacilitiesHomeData
}

type RegionOptionsResult = {
  success?: boolean
  data?: {
    defaultRegionId?: string
    tree?: RegionProvinceOption[]
  }
}

const initialHomeData: MemorialFacilitiesHomeData = {
  regionId: DEFAULT_DIRECTORY_REGION_ID,
  regionName: '当前地区',
  facilityList: [],
  summary: {
    total: 0,
  },
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '加载失败，请稍后重试'
}

const getDefaultSelection = () => {
  return findRegionSelectionByRegionId(DEFAULT_DIRECTORY_REGION_TREE, DEFAULT_DIRECTORY_REGION_ID)
    || getRegionSelectionFromIndices(DEFAULT_DIRECTORY_REGION_TREE, [0, 0, 0])
}

const MemorialFacilities = () => {
  const [regionTree, setRegionTree] = useState<RegionProvinceOption[]>(DEFAULT_DIRECTORY_REGION_TREE)
  const [keyword, setKeyword] = useState('')
  const [pickerIndices, setPickerIndices] = useState<number[]>(() => getDefaultSelection().indices)
  const [pickerColumns, setPickerColumns] = useState<string[][]>(() => getRegionPickerColumns(DEFAULT_DIRECTORY_REGION_TREE, getDefaultSelection().indices))
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection>(() => getDefaultSelection())
  const [currentRegion, setCurrentRegion] = useState<RegionSelection>(() => getDefaultSelection())
  const [locationNote, setLocationNote] = useState('')
  const [homeData, setHomeData] = useState<MemorialFacilitiesHomeData>(initialHomeData)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const loadRegionTree = async () => {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'getDirectoryRegionOptions',
      })
      const result = res.result as RegionOptionsResult

      if (result && result.success && result.data && Array.isArray(result.data.tree) && result.data.tree.length) {
        return {
          tree: result.data.tree,
          defaultRegionId: result.data.defaultRegionId || DEFAULT_DIRECTORY_REGION_ID,
        }
      }
    } catch (error) {
      console.error('获取地区联级配置失败，已使用本地配置', error)
    }

    return {
      tree: DEFAULT_DIRECTORY_REGION_TREE,
      defaultRegionId: DEFAULT_DIRECTORY_REGION_ID,
    }
  }

  const loadHomeData = async (region: RegionSelection) => {
    setLoading(true)
    setErrorText('')

    try {
      const res = await Taro.cloud.callFunction({
        name: 'getMemorialFacilitiesHomeData',
        data: {
          regionId: region.regionId,
        },
      })
      const result = res.result as HomeResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取纪念设施数据失败')
      }

      setHomeData(result.data)
    } catch (error) {
      console.error('加载烈士纪念设施首页失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const syncPickerSelection = (indices: number[]) => {
    const nextColumns = getRegionPickerColumns(regionTree, indices)
    const nextSelection = getRegionSelectionFromIndices(regionTree, indices)
    setPickerIndices(indices)
    setPickerColumns(nextColumns)
    setSelectedRegion(nextSelection)
  }

  useDidShow(() => {
    void (async () => {
      const regionConfig = await loadRegionTree()
      const nextRegionTree = regionConfig.tree
      const matchedRegion = findRegionSelectionByCity(nextRegionTree, locationStore.currentCity)
      const fallbackRegion = findRegionSelectionByRegionId(nextRegionTree, regionConfig.defaultRegionId)
        || getRegionSelectionFromIndices(nextRegionTree, [0, 0, 0])
      const nextCurrentRegion = matchedRegion || fallbackRegion

      setRegionTree(nextRegionTree)
      setCurrentRegion(nextCurrentRegion)
      setPickerIndices(nextCurrentRegion.indices)
      setPickerColumns(getRegionPickerColumns(nextRegionTree, nextCurrentRegion.indices))
      setSelectedRegion(nextCurrentRegion)
      setLocationNote(
        matchedRegion
          ? `当前已根据 ${locationStore.currentCity} 展示本地纪念设施。`
          : `当前城市暂无地区化设施配置，已为你展示 ${fallbackRegion.regionName}。`
      )
      await loadHomeData(nextCurrentRegion)
    })()
  })

  const handlePickerColumnChange = (event) => {
    const { column, value } = event.detail || { column: 0, value: 0 }
    const nextIndices = [...pickerIndices]
    nextIndices[column] = value

    if (column === 0) {
      nextIndices[1] = 0
      nextIndices[2] = 0
    }

    if (column === 1) {
      nextIndices[2] = 0
    }

    setPickerIndices(nextIndices)
    setPickerColumns(getRegionPickerColumns(regionTree, nextIndices))
  }

  const handlePickerChange = (event) => {
    const nextIndices = event && event.detail && Array.isArray(event.detail.value) ? event.detail.value : [0, 0, 0]
    syncPickerSelection(nextIndices)
  }

  const goToResult = () => {
    Taro.navigateTo({
      url: `/pages/MemorialFacilities/page/Result/index?keyword=${encodeURIComponent(keyword.trim())}&regionId=${selectedRegion.regionId}&province=${encodeURIComponent(selectedRegion.province)}&city=${encodeURIComponent(selectedRegion.city)}&district=${encodeURIComponent(selectedRegion.district || '')}&regionLabel=${encodeURIComponent(selectedRegion.displayLabel)}`,
    })
  }

  const goToDetail = (item: MemorialFacility) => {
    if (!item._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/MemorialFacilities/page/Detail/index?facilityId=${item._id}`,
    })
  }

  return (
    <View className='memorial-page'>
      <View className='memorial-location-card'>
        <Text className='memorial-location-label'>当前地理位置</Text>
        <Text className='memorial-location-city'>{locationStore.currentCity}</Text>
        <Text className='memorial-location-region'>{currentRegion.displayLabel}</Text>
        <Text className='memorial-location-note'>{locationNote}</Text>
      </View>

      <View className='memorial-search-card'>
        <Text className='memorial-card-title'>查询条件</Text>

        <View className='memorial-form-group'>
          <Text className='memorial-form-label'>设施名称</Text>
          <Input
            className='memorial-form-input'
            value={keyword}
            placeholder='请输入纪念设施名称关键字'
            confirmType='search'
            onInput={(event) => setKeyword(event.detail.value)}
          />
        </View>

        <View className='memorial-form-group'>
          <Text className='memorial-form-label'>地域查询</Text>
          <Picker
            mode='multiSelector'
            range={pickerColumns}
            value={pickerIndices}
            onColumnChange={handlePickerColumnChange}
            onChange={handlePickerChange}
          >
            <View className='memorial-picker-field'>
              <Text className='memorial-picker-value'>{selectedRegion.displayLabel}</Text>
              <Text className='memorial-picker-arrow'>切换</Text>
            </View>
          </Picker>
        </View>

        <View className='memorial-search-btn' onClick={goToResult}>
          <Text className='memorial-search-btn-text'>开始查询</Text>
        </View>
      </View>

      <View className='memorial-section-head'>
        <View>
          <Text className='memorial-section-title'>当前地区纪念设施</Text>
          <Text className='memorial-section-subtitle'>{homeData.regionName} 共收录 {homeData.summary.total} 处纪念设施</Text>
        </View>
      </View>

      {loading && (
        <LightLoading text='正在获取当前地区纪念设施...' />
      )}

      {!loading && errorText && (
        <View className='memorial-status-card memorial-status-card-error' onClick={() => { void loadHomeData(currentRegion) }}>
          <Text className='memorial-status-title'>加载失败</Text>
          <Text className='memorial-status-desc'>{errorText}</Text>
          <Text className='memorial-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {homeData.facilityList.length ? (
            <View className='memorial-grid'>
              {homeData.facilityList.map((item) => (
                <View
                  key={item._id || item.facilityName}
                  className='memorial-card'
                  onClick={() => goToDetail(item)}
                >
                  <View className='memorial-card-image-wrap'>
                    {item.coverImage ? (
                      <Image className='memorial-card-image' src={item.coverImage} mode='aspectFill' />
                    ) : (
                      <View className='memorial-card-image memorial-card-image-fallback'>
                        <Text className='memorial-card-image-fallback-text'>{item.facilityType}</Text>
                      </View>
                    )}
                  </View>
                  <View className='memorial-card-body'>
                    <Text className='memorial-card-name'>{item.facilityName}</Text>
                    <Text className='memorial-card-location'>{item.locationLabel || item.address}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='memorial-empty-card'>
              <Text className='memorial-empty-title'>当前地区暂未配置纪念设施</Text>
              <Text className='memorial-empty-desc'>可以先在云数据库 `regional_memorial_facilities` 中补充该地区记录。</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export default MemorialFacilities
