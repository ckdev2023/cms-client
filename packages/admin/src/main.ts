import { createApp } from "vue";
import ArcoVue from "@arco-design/web-vue";
import "@arco-design/web-vue/dist/arco.css";
import "./styles/theme.css";
import "./styles/shell.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";
import { pinia } from "./store";

createApp(App).use(pinia).use(router).use(ArcoVue).mount("#app");
