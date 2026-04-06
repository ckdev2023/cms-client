import { useEffect, useState } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";

const TOKEN_KEY = "auth_token";

/**
 * 从 storage 读取 auth token 状态。
 *
 * @returns hasToken 是否已登录, checking 是否正在检查
 */
export function useAuthToken() {
  const { storage } = useAppContainer();
  const [hasToken, setHasToken] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const token = await storage.getString(TOKEN_KEY);
      if (cancelled) return;
      setHasToken(token !== null);
      setChecking(false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  return { hasToken, checking };
}
