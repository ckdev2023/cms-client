import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { InboxScreen } from "@features/inbox/ui/InboxScreen";
import { ConversationScreen } from "@features/inbox/ui/ConversationScreen";

import type { InboxStackParamList } from "./types";

const Stack = createNativeStackNavigator<InboxStackParamList>();

/**
 * Inbox 内嵌导航栈。
 *
 * @returns React 元素
 */
export function InboxStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="InboxList" options={{ title: "メッセージ" }}>
        {({ navigation }) => (
          <InboxScreen
            onSelect={(conversationId) =>
              navigation.navigate("Conversation", { conversationId })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Conversation" options={{ title: "会話" }}>
        {({ route }) => (
          <ConversationScreen conversationId={route.params.conversationId} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
