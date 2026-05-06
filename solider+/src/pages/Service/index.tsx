import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import AppGrid, { GridItem } from '../../components/AppGrid'
import './index.scss'
import { employmentData, militaryRetireData, personalDevData, recordRecentService, ServiceItem, veteransSupportData } from './serviceDate'
import { ensureProtectedPageAccess } from '../../utils/auth'

const Service = () => {
  const handleServiceClick = (item: GridItem) => {
    if (!item.pagePath) {
      return
    }

    if (!ensureProtectedPageAccess(item.pagePath)) {
      return
    }

    recordRecentService(item as ServiceItem)
    Taro.navigateTo({ url: item.pagePath })
  }

  return (
    <View className='container'>
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>就业创业</Text>
        </View>
        <AppGrid
          data={employmentData}
          column={4}
          onClick={handleServiceClick}
        />
      </View>
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>个人建设</Text>
        </View>
        <AppGrid
          data={personalDevData}
          column={4}
          onClick={handleServiceClick}
        />
      </View>
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>军休服务</Text>
        </View>
        <AppGrid
          data={militaryRetireData}
          column={4}
          onClick={handleServiceClick}
        />
      </View>
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>拥军优抚</Text>
        </View>
        <AppGrid
          data={veteransSupportData}
          column={4}
          onClick={handleServiceClick}
        />
      </View>

    </View>
  )
}

export default Service
