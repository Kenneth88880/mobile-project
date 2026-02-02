import { registerRootComponent } from "expo";

import App from "./App";

if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Also suppress in dev
console.disableYellowBox = true;

registerRootComponent(App);
