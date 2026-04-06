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
  XStack,
  YStack,
} from "@shared/ui";
import type { UserDocumentSummary } from "@domain/documents/UserDocument";

import { useDocumentListViewModel } from "../model/useDocumentListViewModel";

/**
 * 文档列表页面（UI 层）。
 *
 * @param props 组件参数
 * @param props.onUpload 上传回调
 * @returns React 元素
 */
export function DocumentListScreen(props: { onUpload?: () => void }) {
  const { state } = useDocumentListViewModel();

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
      <TitleText>書類</TitleText>
      <FlatList<UserDocumentSummary>
        data={state.documents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <XStack
            padding="$3"
            marginBottom="$2"
            borderRadius="$2"
            backgroundColor="$background"
            justifyContent="space-between"
            alignItems="center"
          >
            <YStack>
              <Text fontWeight="600">{item.fileName}</Text>
              <BodyText>{item.docType}</BodyText>
            </YStack>
            <Text color={item.status === "received" ? "$green10" : "$orange10"}>
              {item.status}
            </Text>
          </XStack>
        )}
        ListEmptyComponent={
          <Center>
            <BodyText>書類はありません</BodyText>
          </Center>
        }
      />
    </Screen>
  );
}
