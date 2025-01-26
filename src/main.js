import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './assets/main.css'

const app = createApp(App)
app.use(router)
app.use(store)

// 初期化時に保存された履歴を読み込む
store.commit('initializeHistory')

app.mount('#app')