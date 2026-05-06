type TokenProvider = () => string | null;

let _provider: TokenProvider = () => null;

/**
 * 登録済みトークンプロバイダを取得する。
 *
 * @returns 現在のアクセストークン（未設定時は `null`）
 */
export function getRegisteredToken(): string | null {
  return _provider();
}

/**
 * アプリ起動時に認証レイヤーからトークンプロバイダを登録する。
 *
 * @param provider - トークン取得関数
 */
export function registerTokenProvider(provider: TokenProvider): void {
  _provider = provider;
}
