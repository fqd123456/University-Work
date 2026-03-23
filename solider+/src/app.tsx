import { Component, PropsWithChildren } from 'react'
import Taro from '@tarojs/taro'
import { Provider } from 'mobx-react'

import locationStore from './store/location'

import './app.scss'

const store = {
  locationStore
}

class App extends Component<PropsWithChildren> {
  componentDidMount () {
    Taro.cloud.init({
      env: 'cloud1-4g3q277y403de813',
      // traceUser: true // 如需记录用户访问信息可开启
    })
  }

  componentDidShow () {}

  componentDidHide () {}

  // this.props.children 就是要渲染的页面
  render () {
    return (
      <Provider store={store}>
        {this.props.children}
      </Provider>
    )
  }
}

export default App
