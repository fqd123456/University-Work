export default defineAppConfig({
  pages: [
    'pages/Home/index',
    'pages/Home/page/GuideDetail/index',
    'pages/Employment/index',
    'pages/Employment/page/ModuleDetail/index',
    'pages/Employment/page/JobDetail/index',
    'pages/Employment/page/ResumeEditor/index',
    'pages/EducationTraining/index',
    'pages/EducationTraining/page/Policy/index',
    'pages/EducationTraining/page/Programs/index',
    'pages/EducationTraining/page/Detail/index',
    'pages/EducationTraining/page/Status/index',
    'pages/Entrepreneurship/index',
    'pages/Entrepreneurship/page/Mentor/index',
    'pages/Entrepreneurship/page/Consult/index',
    'pages/Entrepreneurship/page/SupportDetail/index',
    'pages/Health/index',
    'pages/Medals/index',
    'pages/SoulBlog/index',
    'pages/SoulBlog/page/Search/index',
    'pages/SoulBlog/page/Category/index',
    'pages/SoulBlog/page/ArticleDetail/index',
    'pages/SoulBlog/page/Editor/index',
    'pages/MartyrsDirectory/index',
    'pages/MartyrsDirectory/page/Result/index',
    'pages/MartyrsDirectory/page/Detail/index',
    'pages/MemorialFacilities/index',
    'pages/MemorialFacilities/page/Result/index',
    'pages/MemorialFacilities/page/Detail/index',
    'pages/BenefitsCardApply/index',
    'pages/AnnualReview/index',
    'pages/Service/index',
    'pages/News/index',
    'pages/AI/index',
    'pages/Todo/index',
    'pages/Mine/index',
    'pages/Mine/page/Info/index',

    'pages/CityList/index',
    'pages/News/page/NewsDetail/index',
    'pages/Login/index',
    'pages/UserInfo/index',
    'pages/VeteranAuth/index',
    'pages/Ing/index'
  ],
  requiredPrivateInfos: [
    'getLocation',
  ],
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于小程序位置接口的效果展示" // 高速公路行驶持续后台定位
    }
  },
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
        text: '三互',
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
