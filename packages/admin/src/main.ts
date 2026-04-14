import { createApp } from "vue";
import ArcoVue from "@arco-design/web-vue";
import "@arco-design/web-vue/dist/arco.css";
import "./styles/theme.css";
import "./styles/shell.css";
import App from "./App.vue";
import { i18n } from "./i18n";
import { router } from "./router";
import { pinia } from "./store";

const app = createApp(App);
const appTitle = "Gyosei OS";

app.use(pinia).use(router).use(i18n).use(ArcoVue);

router.afterEach((to) => {
  const titleKey =
    typeof to.meta.titleKey === "string" ? to.meta.titleKey : undefined;
  const translatedTitle = titleKey ? i18n.global.t(titleKey) : "";
  const routeTitle =
    typeof to.meta.title === "string"
      ? to.meta.title
      : translatedTitle && translatedTitle !== titleKey
        ? translatedTitle
        : "";

  document.title = routeTitle ? `${routeTitle} - ${appTitle}` : appTitle;
});

router.isReady().then(() => {
  app.mount("#app");
});
