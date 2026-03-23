export default defineAppConfig({
  pages: [
    'pages/Home/index',
    'pages/Service/index',
    'pages/News/index',
    'pages/AI/index',
    'pages/Mine/index',

    'pages/CityList/index',
    'pages/News/page/NewsDetail/index',
    'pages/Login/index',
    'pages/UserInfo/index',
    'pages/VeteranAuth/index',
    'pages/Ing/index'
  ],
  tabBar: {
    color: '#999999',
    selectedColor: '#eb3636',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/Home/index',
        text: '首页',
        iconPath: 'static/tabbar/home1.png',
        selectedIconPath: 'static/tabbar/home2.png',
      },
 
      {
        pagePath: 'pages/Service/index',
        text: '服务',
        iconPath: 'static/tabbar/fuwu1.png',
        selectedIconPath: 'static/tabbar/fuwu2.png',
      },
      
      {
        pagePath: 'pages/AI/index',
        text: 'AI',
        iconPath: 'static/tabbar/ai1.png',
        selectedIconPath: 'static/tabbar/ai2.png',
      },
      {
        pagePath: 'pages/News/index',
        text: '资讯',
        iconPath: 'static/tabbar/zixun1.png',
        selectedIconPath: 'static/tabbar/zixun2.png',
      },
      {
        pagePath: 'pages/Mine/index',
        text: '我的',
        iconPath: 'static/tabbar/wode1.png',
        selectedIconPath: 'static/tabbar/wode2.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#9f4747',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
})
