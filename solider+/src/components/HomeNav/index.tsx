import { View, Text, Input, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'
import locationStore from '../../store/location'

const CustomNav = () => {
  // 获取系统信息和胶囊按钮位置
  const systemInfo = Taro.getSystemInfoSync()
  const menuButtonInfo = Taro.getMenuButtonBoundingClientRect()

  // 计算搜索栏所在的容器样式
  // 顶部内边距 = 胶囊按钮距离顶部的距离
  // 内容高度 = 胶囊按钮本身的高度
  const headerStyle = {
    paddingTop: menuButtonInfo.top + 'px',
    height: menuButtonInfo.height + 'px',
  }

  return (
    <View className='custom-header-wrapper'>
      {/* 1. 底层：轮播图背景 */}
      <Swiper
        className='header-swiper'
        autoplay
        circular
        indicatorDots={false}
      >
        <SwiperItem>
          <View className='swiper-img-placeholder' style={{ backgroundColor: '#a34444' }}>轮播图1</View>
        </SwiperItem>
        <SwiperItem>
          <View className='swiper-img-placeholder' style={{ backgroundColor: '#8b3636' }}>轮播图2</View>
        </SwiperItem>
      </Swiper>

      {/* 2. 顶层：悬浮搜索栏  }*/}
      <View className='search-container' style={headerStyle}>
        <View className='city-picker' onClick={() => Taro.navigateTo({ url: '/pages/CityList/index' })}>
          <Text className='city-name'>{locationStore.currentCity}</Text>
          <View className='arrow-down' />
        </View>

        <View className='search-input-wrapper'>
          <View className='search-icon' />
          <Input
            className='nav-input'
            placeholder='搜索服务或应用'
            placeholderStyle='color: rgba(255,255,255,0.7)'
          />
        </View>
      </View>
    </View>
  )
}

export default CustomNav