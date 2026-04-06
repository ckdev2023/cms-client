import { config } from "@tamagui/config/v3";
import { createTamagui } from "tamagui";

const appConfig = createTamagui(config);

/**
 * Tamagui 配置类型。
 *
 * 用途：
 * - 让 Tamagui 组件获得正确的 token/主题类型提示
 */
export type AppConfig = typeof appConfig;

declare module "tamagui" {
  /**
   * Tamagui 自定义配置类型扩展。
   */
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
