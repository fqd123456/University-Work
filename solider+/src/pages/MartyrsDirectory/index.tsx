import { Input, Picker, Text, View } from '@tarojs/components'
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
import { MartyrDirectoryHomeData, MartyrRecord } from './types'
import './index.scss'

type HomeResult = {
  success?: boolean
  message?: string
  data?: MartyrDirectoryHomeData
}

type RegionOptionsResult = {
  success?: boolean
  data?: {
    defaultRegionId?: string
    tree?: RegionProvinceOption[]
  }
}

const initialHomeData: MartyrDirectoryHomeData = {
  regionId: DEFAULT_DIRECTORY_REGION_ID,
  regionName: '当前地区',
  martyrList: [],
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
  return findRegionSelectionByRegionId(DEFAULT_DIRECTORY_REGION_TREE, DEFAULT_DIRECTORY_REGION_ID) || getRegionSelectionFromIndices(DEFAULT_DIRECTORY_REGION_TREE, [0, 0, 0])
}

const buildCardMeta = (item: MartyrRecord) => {
  return item.address || item.nativePlace || `${item.city}${item.district}`
}

const MartyrsDirectory = () => {
  const [regionTree, setRegionTree] = useState<RegionProvinceOption[]>(DEFAULT_DIRECTORY_REGION_TREE)
  const [keyword, setKeyword] = useState('')
  const [pickerIndices, setPickerIndices] = useState<number[]>(() => getDefaultSelection().indices)
  const [pickerColumns, setPickerColumns] = useState<string[][]>(() => getRegionPickerColumns(DEFAULT_DIRECTORY_REGION_TREE, getDefaultSelection().indices))
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection>(() => getDefaultSelection())
  const [currentRegion, setCurrentRegion] = useState<RegionSelection>(() => getDefaultSelection())
  const [locationNote, setLocationNote] = useState('')
  const [homeData, setHomeData] = useState<MartyrDirectoryHomeData>(initialHomeData)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')

  const syncPickerSelection = (indices: number[]) => {
    const nextColumns = getRegionPickerColumns(regionTree, indices)
    const nextSelection = getRegionSelectionFromIndices(regionTree, indices)
    setPickerIndices(indices)
    setPickerColumns(nextColumns)
    setSelectedRegion(nextSelection)
  }

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
        name: 'getMartyrDirectoryHomeData',
        data: {
          regionId: region.regionId,
        },
      })
      const result = res.result as HomeResult

      if (!result || !result.success || !result.data) {
        throw new Error(result && result.message ? result.message : '获取烈士英名录失败')
      }

      setHomeData(result.data)
    } catch (error) {
      console.error('加载烈士英名录首页失败', error)
      setErrorText(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void (async () => {
      const regionConfig = await loadRegionTree()
      const nextRegionTree = regionConfig.tree
      const matchedRegion = findRegionSelectionByCity(nextRegionTree, locationStore.currentCity)
      const fallbackRegion = findRegionSelectionByRegionId(nextRegionTree, regionConfig.defaultRegionId) || getRegionSelectionFromIndices(nextRegionTree, [0, 0, 0])
      const nextCurrentRegion = matchedRegion || fallbackRegion

      setRegionTree(nextRegionTree)
      setCurrentRegion(nextCurrentRegion)
      setPickerIndices(nextCurrentRegion.indices)
      setPickerColumns(getRegionPickerColumns(nextRegionTree, nextCurrentRegion.indices))
      setSelectedRegion(nextCurrentRegion)
      setLocationNote(
        matchedRegion
          ? `当前已根据 ${locationStore.currentCity} 展示本地烈士英名录。`
          : `当前城市暂无地区化名录配置，已为你展示 ${fallbackRegion.regionName}。`
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
      url: `/pages/MartyrsDirectory/page/Result/index?keyword=${encodeURIComponent(keyword.trim())}&regionId=${selectedRegion.regionId}&province=${encodeURIComponent(selectedRegion.province)}&city=${encodeURIComponent(selectedRegion.city)}&district=${encodeURIComponent(selectedRegion.district || '')}&regionLabel=${encodeURIComponent(selectedRegion.displayLabel)}`,
    })
  }

  const goToDetail = (item: MartyrRecord) => {
    if (!item._id) {
      return
    }

    Taro.navigateTo({
      url: `/pages/MartyrsDirectory/page/Detail/index?martyrId=${item._id}`,
    })
  }

  return (
    <View className='martyr-page'>
      <View className='martyr-location-card'>
        <Text className='martyr-location-label'>当前地理位置</Text>
        <Text className='martyr-location-city'>{locationStore.currentCity}</Text>
        <Text className='martyr-location-region'>{currentRegion.displayLabel}</Text>
        <Text className='martyr-location-note'>{locationNote}</Text>
      </View>

      <View className='martyr-search-card'>
        <Text className='martyr-card-title'>查询条件</Text>

        <View className='martyr-form-group'>
          <Text className='martyr-form-label'>姓名查询</Text>
          <Input
            className='martyr-form-input'
            value={keyword}
            placeholder='请输入烈士姓名关键字'
            confirmType='search'
            onInput={(event) => setKeyword(event.detail.value)}
          />
        </View>

        <View className='martyr-form-group'>
          <Text className='martyr-form-label'>地域查询</Text>
          <Picker
            mode='multiSelector'
            range={pickerColumns}
            value={pickerIndices}
            onColumnChange={handlePickerColumnChange}
            onChange={handlePickerChange}
          >
            <View className='martyr-picker-field'>
              <Text className='martyr-picker-value'>{selectedRegion.displayLabel}</Text>
              <Text className='martyr-picker-arrow'>切换</Text>
            </View>
          </Picker>
        </View>

        <View className='martyr-search-btn' onClick={goToResult}>
          <Text className='martyr-search-btn-text'>开始查询</Text>
        </View>
      </View>

      <View className='martyr-section-head'>
        <View>
          <Text className='martyr-section-title'>当前地区烈士名录</Text>
          <Text className='martyr-section-subtitle'>{homeData.regionName} 共收录 {homeData.summary.total} 位烈士</Text>
        </View>
      </View>

      {loading && (
        <LightLoading text='正在获取当前地区烈士名录...' />
      )}

      {!loading && errorText && (
        <View className='martyr-status-card martyr-status-card-error' onClick={() => { void loadHomeData(currentRegion) }}>
          <Text className='martyr-status-title'>加载失败</Text>
          <Text className='martyr-status-desc'>{errorText}</Text>
          <Text className='martyr-status-action'>点击重试</Text>
        </View>
      )}

      {!loading && !errorText && (
        <>
          {homeData.martyrList.length ? (
            <View className='martyr-card-list'>
              {homeData.martyrList.map((item) => (
                <View
                  key={item._id || item.name}
                  className='martyr-person-card'
                  onClick={() => goToDetail(item)}
                >
                  <Text className='martyr-person-name'>{item.name}</Text>
                  <Text className='martyr-person-years'>{item.lifespan}</Text>
                  <Text className='martyr-person-address'>{buildCardMeta(item)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className='martyr-empty-card'>
              <Text className='martyr-empty-title'>当前地区暂未配置烈士名录</Text>
              <Text className='martyr-empty-desc'>可以先在云数据库 `regional_martyrs_directory` 中补充该地区记录。</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export default MartyrsDirectory
