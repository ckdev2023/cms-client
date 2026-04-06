import React, { useState } from "react";
import { FlatList } from "react-native";
import {
  BodyText,
  Button,
  Center,
  ErrorText,
  Input,
  Loading,
  Screen,
  Text,
  XStack,
  YStack,
} from "@shared/ui";
import { getDisplayText, type Message } from "@domain/inbox/Message";

import { useConversationViewModel } from "../model/useConversationViewModel";

function ConversationHeader(props: {
  showOriginal: boolean;
  toggleTranslation: () => void;
}) {
  const { showOriginal, toggleTranslation } = props;
  return (
    <XStack justifyContent="flex-end" marginBottom="$2">
      <Button size="$2" onPress={toggleTranslation}>
        {showOriginal ? "翻訳を表示" : "原文を表示"}
      </Button>
    </XStack>
  );
}

function MessagesList(props: {
  messages: Message[];
  showOriginal: boolean;
  lang: string;
}) {
  const { messages, showOriginal, lang } = props;
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MessageBubble message={item} showOriginal={showOriginal} lang={lang} />
      )}
      style={{ flex: 1 }}
    />
  );
}

function MessageComposer(props: {
  text: string;
  setText: (v: string) => void;
  onSend: () => Promise<void>;
}) {
  const { text, setText, onSend } = props;
  return (
    <XStack gap="$2" paddingTop="$2">
      <Input
        flex={1}
        testID="message-input"
        placeholder="メッセージを入力"
        value={text}
        onChangeText={setText}
      />
      <Button testID="send-btn" onPress={onSend}>
        送信
      </Button>
    </XStack>
  );
}

/**
 * メッセージ吹き出し。
 *
 * @param props コンポーネント引数
 * @param props.message メッセージ
 * @param props.showOriginal 原文表示フラグ
 * @param props.lang 言語
 * @returns React 元素
 */
function MessageBubble(props: {
  message: Message;
  showOriginal: boolean;
  lang: string;
}) {
  const { message: item, showOriginal, lang } = props;
  const isMe = item.senderType === "app_user";
  const displayText = showOriginal
    ? item.originalText
    : getDisplayText(item, lang);
  return (
    <YStack
      alignSelf={isMe ? "flex-end" : "flex-start"}
      backgroundColor={isMe ? "$blue4" : "$gray4"}
      padding="$2"
      borderRadius="$2"
      marginBottom="$1"
      maxWidth="80%"
    >
      <BodyText>{displayText}</BodyText>
      {item.translationStatus === "pending" && (
        <Text fontSize="$1" color="$orange10">
          翻訳中...
        </Text>
      )}
      <Text fontSize="$1" color="$gray10">
        {item.createdAt}
      </Text>
    </YStack>
  );
}

/**
 * 会話詳細ページ（UI 層）。
 *
 * @param props コンポーネント引数
 * @param props.conversationId 会話 ID
 * @param props.preferredLanguage 言語
 * @returns React 元素
 */
export function ConversationScreen(props: {
  conversationId: string;
  preferredLanguage?: string;
}) {
  const { state, sendMessage, showOriginal, toggleTranslation } =
    useConversationViewModel(props.conversationId);
  const [text, setText] = useState("");
  const lang = props.preferredLanguage ?? "ja";

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

  const onSend = async () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    await sendMessage(trimmed);
    setText("");
  };

  return (
    <Screen>
      <ConversationHeader
        showOriginal={showOriginal}
        toggleTranslation={toggleTranslation}
      />
      <MessagesList
        messages={state.messages}
        showOriginal={showOriginal}
        lang={lang}
      />
      <MessageComposer text={text} setText={setText} onSend={onSend} />
    </Screen>
  );
}
