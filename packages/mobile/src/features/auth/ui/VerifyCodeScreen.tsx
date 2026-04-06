import React, { useState } from "react";
import {
  BodyText,
  Button,
  Center,
  ErrorText,
  Input,
  Loading,
  Screen,
  TitleText,
  YStack,
} from "@shared/ui";

import { useLoginViewModel } from "../model/useLoginViewModel";

/**
 * 验证码输入页面（UI 层）。
 *
 * 职责：输入验证码 → 登录。
 *
 * @param props 组件参数
 * @param props.contact 联系方式
 * @returns React 元素
 */
export function VerifyCodeScreen(props: { contact: string }) {
  const { state, verifyCode } = useLoginViewModel();
  const [code, setCode] = useState("");

  if (state.status === "verifying") {
    return (
      <Center>
        <Loading />
        <BodyText>確認中...</BodyText>
      </Center>
    );
  }

  return (
    <Screen>
      <TitleText>認証コード入力</TitleText>
      <BodyText>認証コードを入力してください</BodyText>
      <YStack gap="$3">
        <Input
          testID="code-input"
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
        />
        {state.status === "error" && state.previousStatus === "code_sent" && (
          <ErrorText testID="error">{state.error.message}</ErrorText>
        )}
        <Button
          testID="verify-btn"
          onPress={() => verifyCode(props.contact, code)}
          disabled={code.length === 0}
        >
          ログイン
        </Button>
      </YStack>
    </Screen>
  );
}
