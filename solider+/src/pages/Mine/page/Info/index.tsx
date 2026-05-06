import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

type InfoItem = {
  title: string
  lines: string[]
}

const contentMap: Record<string, { title: string, desc: string, list: InfoItem[] }> = {
  affairs: {
    title: '联系事务局',
    desc: '以下为几个市级退役军人事务局的模拟联系信息，便于毕业设计展示与页面联调。',
    list: [
      { title: '南昌市退役军人事务局', lines: ['电话：0791-87651234', '地址：南昌市红谷滩区会展路 199 号', '工作时间：周一至周五 09:00-17:30'] },
      { title: '抚州市退役军人事务局', lines: ['电话：0794-8234567', '地址：抚州市临川区迎宾大道 568 号', '工作时间：周一至周五 08:30-17:30'] },
      { title: '赣州市退役军人事务局', lines: ['电话：0797-8899001', '地址：赣州市章贡区长征大道 12 号', '工作时间：周一至周五 09:00-18:00'] },
    ],
  },
  faq: {
    title: '常见问题',
    desc: '整理了小程序内常见的功能操作问题，帮助用户快速上手。',
    list: [
      { title: '为什么有些服务需要登录后使用？', lines: ['与个人身份、进度、健康档案相关的数据需要和当前微信账号绑定，所以需要先登录。'] },
      { title: '待办事项为什么在不同设备上不一样？', lines: ['待办事项走的是云数据库；确认新云函数已部署且当前账号一致后，数据会同步。'] },
      { title: '为什么优待证申请没有直接办理入口？', lines: ['当前页面提供的是官方办理指引与链接复制，后续若有稳定接口或官方跳转参数可继续升级。'] },
      { title: '军魂记录的图片为什么有时打不开？', lines: ['通常与云存储临时链接失效有关，重新进入页面会重新拉取临时访问地址。'] },
    ],
  },
  about: {
    title: '关于',
    desc: '以下内容为毕业设计项目说明与免责提示，页面内容用于学习、演示与模拟业务流程。',
    list: [
      { title: '项目说明', lines: ['本小程序为毕业设计模拟项目，围绕退役军人服务场景进行功能设计与界面实现。'] },
      { title: '数据说明', lines: ['部分内容为模拟数据、示例电话、示例地址，仅用于演示页面效果与交互流程。'] },
      { title: '免责提示', lines: ['涉及政策、办理流程、联系方式等信息时，请以当地退役军人事务部门和官方平台最新发布内容为准。'] },
    ],
  },
}

const MineInfoPage = () => {
  const currentInstance = Taro.getCurrentInstance()
  const router = currentInstance && currentInstance.router ? currentInstance.router : null
  const type = router && router.params && router.params.type ? router.params.type : 'faq'
  const content = contentMap[type] || contentMap.faq

  return (
    <View className='mine-info-page'>
      <View className='mine-info-card'>
        <Text className='mine-info-title'>{content.title}</Text>
        <Text className='mine-info-desc'>{content.desc}</Text>
      </View>

      <View className='mine-info-list'>
        {content.list.map((item) => (
          <View key={item.title} className='mine-info-item'>
            <Text className='mine-info-item-title'>{item.title}</Text>
            {item.lines.map((line) => (
              <Text key={line} className='mine-info-item-line'>{line}</Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

export default MineInfoPage
