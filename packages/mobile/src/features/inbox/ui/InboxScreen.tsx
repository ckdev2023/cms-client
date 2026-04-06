import React from "react";
import { FlatList } from "react-native";
import {
  BodyText,
  Center,
  ErrorText,
  Loading,
  Screen,
  Text,
  TitleText,
  YStack,
} from "@shared/ui";
import type { ConversationSummary } from "@domain/inbox/Conversation";

import { useInboxViewModel } from "../model/useInboxViewModel";

/**
 * 收件箱页面（UI 層）。
 *
 * @param props 组件参数
 * @param props.onSelect 选中会话回调
 * @returns React 元素
 */
export function InboxScreen(props: {
  onSelect?: (conversationId: string) => void;
}) {
  const { state } = useInboxViewModel();

  if (state.status === "loading" || state.status === "idle") {
    return (
      <Center>
        <Loading />
      </Center>
    );
  }

  if (state.status === "error") {
    return (
      <Center padding="$4">
        <ErrorText testID="error">{state.error.code}</ErrorText>
      </Center>
    );
  }

  return (
    <Screen>
      <TitleText>メッセージ</TitleText>
      <FlatList<ConversationSummary>
        data={state.conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <YStack
            padding="$3"
            marginBottom="$2"
            borderRadius="$2"
            backgroundColor="$background"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => props.onSelect?.(item.id)}
          >
            <Text fontWeight="600">{item.channel}</Text>
            <BodyText>ステータス: {item.status}</BodyText>
            <Text fontSize="$2" color="$gray10">
              {item.createdAt}
            </Text>
          </YStack>
        )}
        ListEmptyComponent={
          <Center>
            <BodyText>メッセージはありません</BodyText>
          </Center>
        }
      />
    </Screen>
  );
}
