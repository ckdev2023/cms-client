import type { FollowupChannel } from "../types-detail";

/**
 * UI 側の進捗チャンネルを、REST / DB が受け付ける `lead_followups.channel` に変換する。
 *
 * @param channel フォームの `FollowupChannel` またはそれに相当する文字列
 * @returns サーバー側 `LeadFollowupChannel` として受理されるチャンネル文字列
 */
export function mapLeadFollowupChannelToApi(
  channel: FollowupChannel | string,
): string {
  if (channel === "meeting") return "onsite";
  if (channel === "im") return "other";
  return typeof channel === "string" ? channel : "other";
}

/**
 * API / DB が返した `lead_followups.channel` を一覧・フォーム用の UI チャンネルに正規化する。
 *
 * @param apiChannel サーバー側のチャンネル値
 * @returns `FollowupChannel`（未定義は広いチャンネルへ寄せて表示だけ破綻させない）
 */
export function mapLeadFollowupChannelFromApi(
  apiChannel: string,
): FollowupChannel {
  if (apiChannel === "onsite") return "meeting";
  if (
    apiChannel === "wechat" ||
    apiChannel === "line" ||
    apiChannel === "other"
  )
    return "im";
  if (apiChannel === "phone") return "phone";
  if (apiChannel === "email") return "email";
  return "im";
}
