import { createApp } from "vue";
import * as Sentry from "@sentry/vue";
import { Integrations } from "@sentry/tracing";
import InlineSvg from "vue-inline-svg";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "./index.css";

const app = createApp(App)
  .component("inline-svg", InlineSvg)
  .use(router)
  .use(store);

if (["development", "staging", "production"].includes(import.meta.env.MODE)) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_APP_SENTRY_DSN,
    integrations: [
      new Integrations.BrowserTracing({
        routingInstrumentation: Sentry.vueRouterInstrumentation(router),
      }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
    logErrors: true,
    environment: process.env.NODE_ENV,
  });
}

app.mount("#app");
