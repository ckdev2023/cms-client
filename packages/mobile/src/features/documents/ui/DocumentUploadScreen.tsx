import React from "react";
import {
  BodyText,
  Button,
  Center,
  ErrorText,
  Loading,
  Screen,
  TitleText,
} from "@shared/ui";

import { useDocumentUploadViewModel } from "../model/useDocumentUploadViewModel";

/**
 * 文档上传页面（UI 层）。
 *
 * @param props 组件参数
 * @param props.onComplete 上传完成回调
 * @returns React 元素
 */
export function DocumentUploadScreen(props: { onComplete?: () => void }) {
  const { state, upload } = useDocumentUploadViewModel();

  if (state.status === "uploading") {
    return (
      <Center>
        <Loading />
        <BodyText>アップロード中...</BodyText>
      </Center>
    );
  }

  if (state.status === "success") {
    return (
      <Screen>
        <TitleText>完了</TitleText>
        <BodyText>書類がアップロードされました</BodyText>
        <Button onPress={props.onComplete}>戻る</Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <TitleText>書類アップロード</TitleText>
      {state.status === "error" && (
        <ErrorText testID="error">{state.error.message}</ErrorText>
      )}
      <Button
        testID="pick-file-btn"
        onPress={() => {
          // MVP: 直接用 placeholder data 模拟上传
          upload({
            fileName: "document.pdf",
            contentType: "application/pdf",
            data: "",
            docType: "general",
          });
        }}
      >
        ファイルを選択してアップロード
      </Button>
    </Screen>
  );
}
