import React, { useState } from "react";
import {
  BodyText,
  Button,
  Center,
  ErrorText,
  Input,
  Loading,
  Screen,
  Text,
  TitleText,
  YStack,
} from "@shared/ui";
import type { AppUser } from "@domain/auth/AppUser";

import { useProfileViewModel } from "../model/useProfileViewModel";

const LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
];

/**
 * プロフィール情報表示部分。
 *
 * @param props コンポーネント引数
 * @param props.user ユーザー
 * @param props.editName 編集中の名前
 * @param props.setEditName 名前セッター
 * @param props.updateProfile プロフィール更新
 * @param props.logout ログアウト
 * @param props.onLogout ログアウト完了コールバック
 * @returns React 元素
 */
function ProfileBody(props: {
  user: AppUser;
  editName: string | null;
  setEditName: (v: string | null) => void;
  updateProfile: (d: { name?: string; preferredLanguage?: string }) => void;
  logout: () => Promise<void>;
  onLogout?: () => void;
}) {
  const {
    user,
    editName,
    setEditName,
    updateProfile,
    logout: doLogout,
    onLogout,
  } = props;
  return (
    <YStack gap="$3">
      <YStack gap="$1">
        <Text fontWeight="600">名前</Text>
        <Input
          testID="name-input"
          value={editName ?? user.name}
          onChangeText={setEditName}
          onBlur={() => {
            if (editName !== null && editName !== user.name)
              updateProfile({ name: editName });
          }}
        />
      </YStack>
      <YStack gap="$1">
        <Text fontWeight="600">メール</Text>
        <BodyText>{user.email ?? "—"}</BodyText>
      </YStack>
      <YStack gap="$1">
        <Text fontWeight="600">電話番号</Text>
        <BodyText>{user.phone ?? "—"}</BodyText>
      </YStack>
      <YStack gap="$1">
        <Text fontWeight="600">言語設定</Text>
        {LANGUAGES.map((l) => (
          <Button
            key={l.code}
            testID={`lang-${l.code}`}
            variant={user.preferredLanguage === l.code ? undefined : "outlined"}
            onPress={() => updateProfile({ preferredLanguage: l.code })}
          >
            {l.label}
          </Button>
        ))}
      </YStack>
      <Button
        testID="logout-btn"
        theme="red"
        onPress={async () => {
          await doLogout();
          onLogout?.();
        }}
      >
        ログアウト
      </Button>
    </YStack>
  );
}

/**
 * 設定ページ（UI 層）。
 *
 * @param props コンポーネント引数
 * @param props.onLogout ログアウト完了コールバック
 * @returns React 元素
 */
export function ProfileScreen(props: { onLogout?: () => void }) {
  const { state, updateProfile, logout } = useProfileViewModel();
  const [editName, setEditName] = useState<string | null>(null);

  if (
    state.status === "loading" ||
    state.status === "idle" ||
    state.status === "updating"
  ) {
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
      <TitleText>設定</TitleText>
      <ProfileBody
        user={state.user}
        editName={editName}
        setEditName={setEditName}
        updateProfile={updateProfile}
        logout={logout}
        onLogout={props.onLogout}
      />
    </Screen>
  );
}
