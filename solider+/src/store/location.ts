import { observable, action, decorate } from 'mobx'

class LocationStore {
  currentCity = '抚州市'

  setCity(cityName) {
    this.currentCity = cityName
  }
}

// v5 需要手动装饰
decorate(LocationStore, {
  currentCity: observable,
  setCity: action
})

export default new LocationStore()