import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { router } from './router/index';
import App from './App.vue';
import './styles/index.css';
import './styles/mobile.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.mount('#app');
