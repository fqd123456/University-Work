import { View, Text, } from '@tarojs/components'
import Taro from '@tarojs/taro'
import CustomNav from '../../components/HomeNav'
import AppGrid from '../../components/AppGrid'
import './index.scss'

const Mine = () => {
  // 新闻资讯列表
  const newsList = [
    { id: 1, title: '退役军人事务局发布最新优待政策' },
    { id: 2, title: '全市退役军人专场招聘会圆满结束' },
    { id: 3, title: '关于开展志愿服务活动的通知' }
  ];
  // 指引步骤
  const items = [
    { 'title': '报道', 'desc': '退役军人事务局' },
    { 'title': '保险', 'desc': '社保局' },
    { 'title': '培训', 'desc': '退役军人事务局（可选）' },
    { 'title': '组织关系转移', 'desc': '人民政府' },
    { 'title': '优待证', 'desc': '退役军人服务站' },
  ]

  const serviceData =
    [
      {
        image: 'https://img12.360buyimg.com/jdphoto/s72x72_jfs/t6160/14/2008729947/2754/7d512a86/595c3aeeNa89ddf71.png',
        value: '逐月领取退役金退役军人年审'
      },
      {
        image: 'https://img20.360buyimg.com/jdphoto/s72x72_jfs/t15151/308/1012305375/2300/536ee6ef/5a411466N040a074b.png',
        value: '就业服务'
      },
      {
        image: 'https://img10.360buyimg.com/jdphoto/s72x72_jfs/t5872/209/5240187906/2872/8fa98cd/595c3b2aN4155b931.png',
        value: '自主择业军转干部年审'
      },
      {
        image: 'https://img12.360buyimg.com/jdphoto/s72x72_jfs/t10660/330/203667368/1672/801735d7/59c85643N31e68303.png',
        value: '军休干部年审'
      },
      {
        image: 'https://img14.360buyimg.com/jdphoto/s72x72_jfs/t17251/336/1311038817/3177/72595a07/5ac44618Na1db7b09.png',
        value: '无军籍退休职工年审'
      },
      {
        image: 'https://img30.360buyimg.com/jdphoto/s72x72_jfs/t5770/97/5184449507/2423/294d5f95/595c3b4dNbc6bc95d.png',
        value: '创业扶持'
      },
      {
        image: 'https://img12.360buyimg.com/jdphoto/s72x72_jfs/t10660/330/203667368/1672/801735d7/59c85643N31e68303.png',
        value: '企业军转干部年审'
      },
      {
        image: 'https://img14.360buyimg.com/jdphoto/s72x72_jfs/t17251/336/1311038817/3177/72595a07/5ac44618Na1db7b09.png',
        value: '查看更多'
      },
    ]

  return (
    <View className='mainPage'>
      <CustomNav />
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>新闻资讯</Text>
          {/* 点击事件，跳转到资讯页 */}
          <Text className='itemRight' onClick={() => Taro.switchTab({ url: '/pages/News/index' })}>查看更多</Text>
        </View>
        <View className='itemContent'>
          {newsList.map(item => (
            <View key={item.id} className='itemNews'>
              <Text className='itemCenter'>{item.title}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 退伍指引 */}
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>退伍指引</Text>
        </View>
        <View className='guide-steps'>
          {items.map((item, index) => (
            <View key={item.title} className='guide-step'>
              <View className='guide-step-top'>
                {index > 0 ? <View className='guide-step-line' /> : <View className='guide-step-line guide-step-line-hidden' />}
                <View className={`guide-step-circle ${index === 0 ? 'guide-step-circle-active' : ''}`}>
                  <Text className='guide-step-num'>{index + 1}</Text>
                </View>
                {index < items.length - 1 ? <View className='guide-step-line' /> : <View className='guide-step-line guide-step-line-hidden' />}
              </View>
              <Text className={`guide-step-title ${index === 0 ? 'guide-step-title-active' : ''}`}>{item.title}</Text>
              <Text className='guide-step-desc'>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 常用服务 */}
      <View className='card'>
        <View className='itemTitle'>
          <Text className='itemLeft'>常用服务</Text>
        </View>
        {/* 点击进入相关页面 */}
        <AppGrid
          data={serviceData}
          column={4}
        />
      </View>
    </View>
  )
}

export default Mine
