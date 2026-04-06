import React from "react";
import {
  Button as TButton,
  Input as TInput,
  Paragraph,
  Progress as TProgress,
  Spinner,
  Text,
  type TextProps,
  XStack as TXStack,
  YStack,
  type YStackProps,
} from "tamagui";

/* ── tamagui 基础组件的 feature 层可用再导出 ─────────────── */
export {
  TButton as Button,
  TInput as Input,
  TProgress as Progress,
  Text,
  TXStack as XStack,
  YStack,
};
export type { TextProps, YStackProps };

/**
 * 页面级容器。
 *
 * 用于统一页面的基础布局参数（如 padding / gap），避免页面中散落样式细节。
 *
 * @param props 组件参数
 * @returns React 元素
 */
export function Screen(props: YStackProps) {
  return <YStack flex={1} padding="$4" gap="$3" {...props} />;
}

/**
 * 居中容器。
 *
 * 常用于 loading / error 等状态页面。
 *
 * @param props 组件参数
 * @returns React 元素
 */
export function Center(props: YStackProps) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" {...props} />
  );
}

/**
 * 标题文本。
 *
 * @param props 组件参数
 * @returns React 元素
 */
export function TitleText(props: TextProps) {
  return <Text fontSize="$7" fontWeight="700" {...props} />;
}

/**
 * 正文文本（段落）。
 *
 * @param props 组件参数
 * @returns React 元素
 */
export function BodyText(props: React.ComponentProps<typeof Paragraph>) {
  return <Paragraph {...props} />;
}

/**
 * 错误提示文本（默认红色）。
 *
 * @param props 组件参数
 * @returns React 元素
 */
export function ErrorText(props: TextProps) {
  return <Text color="$red10" fontSize="$5" {...props} />;
}

/**
 * 加载指示器。
 *
 * @returns React 元素
 */
export function Loading() {
  return <Spinner />;
}
