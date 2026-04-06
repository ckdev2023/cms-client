import React from "react";
import {
  BodyText,
  Center,
  ErrorText,
  Loading,
  Progress,
  Screen,
  Text,
  TitleText,
  XStack,
  YStack,
} from "@shared/ui";

import { useCaseDetailViewModel } from "../model/useCaseDetailViewModel";

const STATUS_PROGRESS: Record<string, number> = {
  open: 20,
  in_progress: 50,
  review: 75,
  completed: 100,
  closed: 100,
};

/**
 * 案件详情页面（UI 層）。
 *
 * @param props 组件参数
 * @param props.caseId 案件 ID
 * @returns React 元素
 */
export function CaseDetailScreen(props: { caseId: string }) {
  const { state } = useCaseDetailViewModel(props.caseId);

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

  const { caseDetail } = state;
  const progress = STATUS_PROGRESS[caseDetail.status] ?? 0;

  return (
    <Screen>
      <TitleText>{caseDetail.caseTypeCode}</TitleText>
      <BodyText>ステータス: {caseDetail.status}</BodyText>

      <YStack gap="$2">
        <Text>進捗</Text>
        <Progress value={progress} max={100}>
          <Progress.Indicator />
        </Progress>
      </YStack>

      {caseDetail.dueAt && <BodyText>期限: {caseDetail.dueAt}</BodyText>}

      <TitleText fontSize="$5">書類</TitleText>
      {caseDetail.documents.map((doc) => (
        <XStack key={doc.id} justifyContent="space-between" padding="$2">
          <Text>{doc.name}</Text>
          <Text>{doc.status}</Text>
        </XStack>
      ))}

      <TitleText fontSize="$5">タイムライン</TitleText>
      {caseDetail.timeline.map((entry) => (
        <YStack key={entry.id} padding="$2">
          <Text>{entry.action}</Text>
          <Text fontSize="$2" color="$gray10">
            {entry.createdAt}
          </Text>
        </YStack>
      ))}
    </Screen>
  );
}
