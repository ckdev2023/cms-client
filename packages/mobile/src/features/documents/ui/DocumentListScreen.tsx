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
import type { DocumentRequirement } from "@domain/documents/UserDocument";

import { useDocumentListViewModel } from "../model/useDocumentListViewModel";

const STATUS_LABELS: Record<string, string> = {
  not_sent: "未発出",
  waiting_upload: "待提交",
  uploaded_reviewing: "待審核",
  approved: "通過",
  revision_required: "要補正",
  waived: "不要",
  expired: "期限切れ",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "$green10",
  waived: "$gray10",
  revision_required: "$red10",
  expired: "$red10",
  uploaded_reviewing: "$blue10",
  waiting_upload: "$orange10",
  not_sent: "$gray10",
};

function RequirementRow({ item }: { item: DocumentRequirement }) {
  return (
    <XStack
      padding="$3"
      marginBottom="$2"
      borderRadius="$2"
      backgroundColor="$background"
      justifyContent="space-between"
      alignItems="center"
    >
      <YStack>
        <Text fontWeight="600">{item.itemName}</Text>
        <BodyText>{item.category}</BodyText>
      </YStack>
      <Text color={STATUS_COLORS[item.status] ?? "$gray10"}>
        {STATUS_LABELS[item.status] ?? item.status}
      </Text>
    </XStack>
  );
}

/**
 * 資料一覧画面。
 *
 * @param props - 画面プロパティ
 * @param props.onUpload - アップロード画面遷移コールバック
 * @returns React 要素
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

  const pct = Math.round(state.completion.rate * 100);

  return (
    <Screen>
      <TitleText>書類</TitleText>
      <BodyText marginBottom="$3">
        完了率: {pct}% ({state.completion.approved}/
        {state.completion.requiredTotal})
      </BodyText>
      <FlatList<DocumentRequirement>
        data={state.requirements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RequirementRow item={item} />}
        ListEmptyComponent={
          <Center>
            <BodyText>書類はありません</BodyText>
          </Center>
        }
      />
    </Screen>
  );
}
