import { createApp } from "vue";
import ArcoVue from "@arco-design/web-vue";
import "@arco-design/web-vue/dist/arco.css";
import "./style.css";
import "./styles/breakpoints.css";
import "./styles/theme.css";
import "./styles/shell.css";
import App from "./App.vue";
import { i18n } from "./i18n";
import { router } from "./router";
import { pinia } from "./store";
import { setupTitleSync } from "./titleSync";

const app = createApp(App);

app.use(pinia).use(router).use(i18n).use(ArcoVue);

setupTitleSync(router);

router.isReady().then(() => {
  app.mount("#app");
});
