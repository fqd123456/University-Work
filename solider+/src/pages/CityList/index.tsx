import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import { observer } from 'mobx-react'
import Taro, { useDidShow } from '@tarojs/taro'
import locationStore from '../../store/location'
import { getRealLocationInfo, SETTLEMENT_CITY } from '../../utils/location'
import './index.scss'

const CITY_DATA = [
    { title: 'B', items: ['北京市', '保定市'] },
    { title: 'C', items: ['成都市', '重庆市', '长沙市'] },
    { title: 'F', items: ['福州市', '抚州市'] },
    { title: 'G', items: ['广州市', '贵阳市'] },
    { title: 'H', items: ['杭州市', '合肥市'] },
    { title: 'N', items: ['南昌市', '南京市', '宁波市'] },
    { title: 'S', items: ['上海市', '深圳市', '苏州市'] },
    { title: 'T', items: ['天津市', '太原市'] },
    { title: 'W', items: ['武汉市', '无锡市'] },
    { title: 'X', items: ['西安市', '厦门市'] },
]
const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z']
const HOT_CITIES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '抚州市']

const CityList = observer(() => {
    const [scrollTarget, setScrollTarget] = useState('')
    const [locatedCity, setLocatedCity] = useState(SETTLEMENT_CITY)

    const handleSelect = (city) => {
        locationStore.setCity(city)
        Taro.navigateBack() // 选中后返回首页
    }

    useDidShow(() => {
        void (async () => {
            const locationInfo = await getRealLocationInfo(SETTLEMENT_CITY)
            setLocatedCity(locationInfo.city || SETTLEMENT_CITY)
        })()
    })

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
                        <View className='city-tag active' onClick={() => handleSelect(locatedCity)}>{locatedCity}</View>
                    </View>
                </View>

                {/* 热门城市 */}
                <View className='section'>
                    <Text className='section-title'>热门城市</Text>
                    <View className='tag-grid'>
                        {HOT_CITIES.map(city => (
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
