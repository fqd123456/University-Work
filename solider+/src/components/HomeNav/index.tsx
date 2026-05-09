import { View, Text, Input, Swiper, SwiperItem, Image } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'
import { ensureProtectedPageAccess } from '../../utils/auth'
import { recordRecentService, searchServiceItems, ServiceItem } from '../../pages/Service/serviceDate'
import { getRealLocationInfo, SETTLEMENT_CITY } from '../../utils/location'

type InputEvent = {
  detail: {
    value: string
  }
}

const CustomNav = () => {
  const bannerImages = [
    // 退役军人与家庭题材
    'https://images.pexels.com/photos/7985854/pexels-photo-7985854.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=720',
    // 退役军人纪念活动题材
    'https://images.pexels.com/photos/31992285/pexels-photo-31992285.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=720',
  ]

  // 获取系统信息和胶囊按钮位置
  const menuButtonInfo = Taro.getMenuButtonBoundingClientRect()

  // 计算搜索栏所在的容器样式
  // 顶部内边距 = 胶囊按钮距离顶部的距离
  // 内容高度 = 胶囊按钮本身的高度
  const headerStyle = {
    paddingTop: menuButtonInfo.top + 'px',
    height: menuButtonInfo.height + 'px',
  }

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [keyword, setKeyword] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [cityName, setCityName] = useState(SETTLEMENT_CITY)

  const searchResultList = searchServiceItems(keyword).slice(0, 6)

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const handleInput = (event: InputEvent) => {
    const nextKeyword = event.detail.value || ''
    setKeyword(nextKeyword)
    setSearchVisible(!!`${nextKeyword}`.trim())
  }

  const handleFocus = () => {
    clearHideTimer()
    if (`${keyword}`.trim()) {
      setSearchVisible(true)
    }
  }

  const handleBlur = () => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setSearchVisible(false)
    }, 160)
  }

  const handleSelectService = (item: ServiceItem) => {
    clearHideTimer()

    if (!item.pagePath) {
      return
    }

    if (!ensureProtectedPageAccess(item.pagePath)) {
      return
    }

    setKeyword(item.value)
    setSearchVisible(false)
    recordRecentService(item)
    Taro.navigateTo({ url: item.pagePath })
  }

  useEffect(() => {
    void (async () => {
      const locationInfo = await getRealLocationInfo(SETTLEMENT_CITY)
      setCityName(locationInfo.city || SETTLEMENT_CITY)
    })()
  }, [])

  return (
    <View className='custom-header-wrapper'>
      {/* 1. 底层：轮播图背景 */}
      <Swiper
        className='header-swiper'
        autoplay
        circular
        indicatorDots={false}
      >
        {bannerImages.map((src, index) => (
          <SwiperItem key={`${src}-${index}`}>
            <View className='swiper-banner-item'>
              <Image className='swiper-banner-image' src={src} mode='aspectFill' />
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      {/* 2. 顶层：悬浮搜索栏  }*/}
      <View className='search-container' style={headerStyle}>
        <View className='city-picker' onClick={() => Taro.navigateTo({ url: '/pages/CityList/index' })}>
          <Text className='city-name'>{cityName}</Text>
          <View className='arrow-down' />
        </View>

        <View className='search-input-wrapper'>
          <View className='search-icon' />
          <Input
            className='nav-input'
            value={keyword}
            placeholder='搜索服务或应用'
            placeholderStyle='color: rgba(255,255,255,0.7)'
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          {searchVisible && keyword.trim() ? (
            <View className='search-result-popover'>
              {searchResultList.length ? (
                searchResultList.map((item) => (
                  <View
                    key={item.pagePath || item.value}
                    className='search-result-item'
                    onClick={() => handleSelectService(item)}
                  >
                    <Image className='search-result-icon' src={item.image} mode='aspectFit' />
                    <View className='search-result-copy'>
                      <Text className='search-result-title'>{item.value}</Text>
                      <Text className='search-result-desc'>点击进入对应服务</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View className='search-result-empty'>
                  <Text className='search-result-empty-text'>未找到相关服务，换个关键词试试</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export default CustomNav
