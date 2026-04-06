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

function ProfileNameField(props: {
  name: string;
  editName: string | null;
  setEditName: (v: string | null) => void;
  updateProfile: (d: { name?: string; preferredLanguage?: string }) => void;
}) {
  const { name, editName, setEditName, updateProfile } = props;
  return (
    <YStack gap="$1">
      <Text fontWeight="600">名前</Text>
      <Input
        testID="name-input"
        value={editName ?? name}
        onChangeText={setEditName}
        onBlur={() => {
          if (editName !== null && editName !== name)
            updateProfile({ name: editName });
        }}
      />
    </YStack>
  );
}

function ProfileReadOnlyField(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <YStack gap="$1">
      <Text fontWeight="600">{label}</Text>
      <BodyText>{value}</BodyText>
    </YStack>
  );
}

function LanguageSelector(props: {
  preferredLanguage?: string;
  updateProfile: (d: { name?: string; preferredLanguage?: string }) => void;
}) {
  const { preferredLanguage, updateProfile } = props;
  return (
    <YStack gap="$1">
      <Text fontWeight="600">言語設定</Text>
      {LANGUAGES.map((l) => (
        <Button
          key={l.code}
          testID={`lang-${l.code}`}
          variant={preferredLanguage === l.code ? undefined : "outlined"}
          onPress={() => updateProfile({ preferredLanguage: l.code })}
        >
          {l.label}
        </Button>
      ))}
    </YStack>
  );
}

function LogoutButton(props: {
  logout: () => Promise<void>;
  onLogout?: () => void;
}) {
  const { logout, onLogout } = props;
  return (
    <Button
      testID="logout-btn"
      theme="red"
      onPress={async () => {
        await logout();
        onLogout?.();
      }}
    >
      ログアウト
    </Button>
  );
}

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
      <ProfileNameField
        name={user.name}
        editName={editName}
        setEditName={setEditName}
        updateProfile={updateProfile}
      />
      <ProfileReadOnlyField label="メール" value={user.email ?? "—"} />
      <ProfileReadOnlyField label="電話番号" value={user.phone ?? "—"} />
      <LanguageSelector
        preferredLanguage={user.preferredLanguage}
        updateProfile={updateProfile}
      />
      <LogoutButton logout={doLogout} onLogout={onLogout} />
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
