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
 * 登录页面（UI 层）。
 *
 * 职责：输入邮箱/手机 → 发送验证码。
 *
 * @returns React 元素
 */
export function LoginScreen() {
  const { state, requestCode } = useLoginViewModel();
  const [contact, setContact] = useState("");

  if (state.status === "requesting_code") {
    return (
      <Center>
        <Loading />
        <BodyText>送信中...</BodyText>
      </Center>
    );
  }

  return (
    <Screen>
      <TitleText>ログイン</TitleText>
      <BodyText>メールアドレスまたは電話番号を入力してください</BodyText>
      <YStack gap="$3">
        <Input
          testID="contact-input"
          placeholder="email@example.com"
          value={contact}
          onChangeText={setContact}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {state.status === "error" && state.previousStatus === "idle" && (
          <ErrorText testID="error">{state.error.message}</ErrorText>
        )}
        <Button
          testID="request-code-btn"
          onPress={() => requestCode(contact)}
          disabled={contact.length === 0}
        >
          認証コードを送信
        </Button>
      </YStack>
    </Screen>
  );
}
