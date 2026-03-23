import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import { observer } from 'mobx-react'
import Taro from '@tarojs/taro'
import locationStore from '../../store/location'
import './index.scss'

// 假设的城市数据结构
const CITY_DATA = [
    { title: 'A', items: ['阿坝州', '阿尔山', '阿克苏'] },
    { title: 'B', items: ['北京市', '白银市', '保定市'] },
    // ... 更多数据
]
const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z']

const CityList = observer(() => {
    const [scrollTarget, setScrollTarget] = useState('')

    const handleSelect = (city) => {
        locationStore.setCity(city)
        Taro.navigateBack() // 选中后返回首页
    }

    return (
        <View className='city-list-page'>
            {/* 搜索框 */}
            <View className='search-header'>
                <Input placeholder='请输入城市名称' className='search-input' />
            </View>

            <ScrollView
                scrollY
                scrollIntoView={scrollTarget}
                scrollWithAnimation
                className='list-scroll'
            >
                {/* 定位城市 */}
                <View className='section' id='top'>
                    <Text className='section-title'>定位/历史城市</Text>
                    <View className='tag-container'>
                        <View className='city-tag active'>{locationStore.currentCity}</View>
                    </View>
                </View>

                {/* 热门城市 */}
                <View className='section'>
                    <Text className='section-title'>热门城市</Text>
                    <View className='tag-grid'>
                        {['北京市', '广州市', '上海市', '成都市'].map(city => (
                            <View key={city} className='city-tag' onClick={() => handleSelect(city)}>{city}</View>
                        ))}
                    </View>
                </View>

                {/* 字母列表 */}
                {CITY_DATA.map(group => (
                    <View className='city-group' key={group.title} id={group.title}>
                        <Text className='group-title'>{group.title}</Text>
                        {group.items.map(city => (
                            <View key={city} className='city-item' onClick={() => handleSelect(city)}>
                                {city}
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>

            {/* 右侧索引条 */}
            <View className='alphabet-nav'>
                {ALPHABET.map(letter => (
                    <Text key={letter} onClick={() => setScrollTarget(letter)}>{letter}</Text>
                ))}
            </View>
        </View>
    )
})

export default CityList