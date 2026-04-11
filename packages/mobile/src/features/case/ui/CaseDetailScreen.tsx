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
import type { CaseStage } from "@domain/case/Case";

import { useCaseDetailViewModel } from "../model/useCaseDetailViewModel";

const STAGE_PROGRESS: Record<CaseStage, number> = {
  S1: 10,
  S2: 20,
  S3: 35,
  S4: 50,
  S5: 65,
  S6: 75,
  S7: 85,
  S8: 95,
  S9: 100,
};

/**
 * 案件詳細ページ（UI 層）。
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
  const progress = STAGE_PROGRESS[caseDetail.stage] ?? 0;

  return (
    <Screen>
      <TitleText>{caseDetail.caseType}</TitleText>
      <BodyText>ステージ: {caseDetail.stage}</BodyText>

      <YStack gap="$2">
        <Text>進捗</Text>
        <Progress value={progress} max={100}>
          <Progress.Indicator />
        </Progress>
      </YStack>

      {caseDetail.nextDeadlineDueAt && (
        <BodyText>期限: {caseDetail.nextDeadlineDueAt}</BodyText>
      )}

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
