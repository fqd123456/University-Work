import { Text, View } from '@tarojs/components'
import './index.scss'

type LightLoadingProps = {
  text?: string
  className?: string
}

const LightLoading = ({ text = '正在加载', className = '' }: LightLoadingProps) => {
  const nextClassName = ['light-loading', className].filter(Boolean).join(' ')

  return (
    <View className={nextClassName}>
      <View className='light-loading-spinner' />
      <Text className='light-loading-text'>{text}</Text>
    </View>
  )
}

export default LightLoading
