import utils from './utils'
/**
 * 详情，修改，新增可共用的mixin
 * 路由匹配规则：
 * /module
 * /module/create
 * /module/:id/edit
 * /module/:id
 * @param {Object} options 选项
 *  - {String} [key] - id的唯一标识
 *  - {Function} [fetch] - 请求列表的调用的钩子函数，需要return Promise 类型
 *  - {Function} [model] - 数据的字段集合
 * @return {Object}
 */
export default function vueMixinFetchDetail (options) {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof options.fetch !== 'function') {
      return new Error({ msg: '[vueMixinFetchDetail] get options typeof function' })
    }
    if (typeof options.model !== 'function') {
      return new Error({ msg: '[vueMixinFetchDetail] get options typeof function' })
    }
  }
  if (options.key === undefined) { // 列表和详情唯一的id键值，不可重复
    options.key = 'id'
  }
  const name = 'fetchDetail'
  const store = {
    detail: options.model()
  }

  return {
    name,
    store,
    install (VueMixin) { // 安装程序
      const { fetchList } = VueMixin.store
      if (process.env.NODE_ENV !== 'production') {
        if (!utils.isObject(fetchList)) {
          return new Error({ msg: 'Please install the FetchList plugin' })
        }
      }
      function getListItemIndex (key) { // 获取当前页面在列表中的索引，此处可使用算法来优化查找的性能、待续。。。
        const { list, list: { length } } = fetchList
        for (let i = 0; i < length; i++) {
          if (String(list[i][options.key]) === String(key)) { // 路由传来的key可能是字符串，也可能是数字
            return i
          }
        }
        return -1
      }

      this.listUnwatch = VueMixin.vm.$watch('store.fetchList.list', (list) => { // 监听列表的数据改变
        const index = getListItemIndex(store.detail[options.key])
        if (index < 0) return false
        const detail = list[index]
        Object.keys(store.detail).forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(detail, k)) { // 如果存在这个属性，才更新到详情中
            store.detail[k] = detail[k]
          }
        })
      }, { deep: true })
      this.detailUnwatch = VueMixin.vm.$watch(`store.${name}.detail`, (detail) => { // 监听详情的数据改变
        const index = getListItemIndex(store.detail[options.key])
        if (index < 0) return false
        Object.keys(fetchList.list[index]).forEach((k) => {
          fetchList.list[index][k] = detail[k]
        })
      }, { deep: true })
      return {
        props: [options.key],
        beforeRouteEnter (to, from, next) { // 每次路由变化都会调用此钩子函数
          if (String(to.params[options.key]) !== String(store.detail[options.key])) { // 判断详情的数据和路由要跳转的页面是否一致
            const index = getListItemIndex(to.params[options.key])
            Object.assign(store.detail, options.model(), fetchList.list[index] || {})
          }
          next()
        },
        computed: {
          ...utils.createComputed(store),
          $fetchDetail () {
            const self = this
            function fetchDetail () {
              if (!self[options.key]) return
              return options.fetch.call(self).then((detail) => (store.detail = detail))
            }
            return fetchDetail
          }
        },
        created () {
          this.$fetchDetail()
        },
        watch: {
          [options.key] () {
            this.$fetchDetail()
          }
        }
      }
    },
    destroyed () { // 销毁插件，释放内存
      this.listUnwatch()
      this.detailUnwatch()
    }
  }
}
