import { useEffect, useState, useCallback } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { AppUser } from "@domain/auth/AppUser";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * Profile 页面的 ViewState。
 */
export type ProfileViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; user: AppUser }
  | { status: "updating"; user: AppUser }
  | { status: "error"; error: AppError };

/**
 * Profile 页面的 ViewModel Hook。
 *
 * @returns ViewModel 状态与操作
 */
export function useProfileViewModel() {
  const { profileRepository, logger } = useAppContainer();
  const [state, setState] = useState<ProfileViewState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      try {
        const user = await profileRepository.getProfile();
        if (cancelled) return;
        setState({ status: "success", user });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Profile:load_failed", { code: error.code });
        if (cancelled) return;
        setState({ status: "error", error });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [profileRepository, logger]);

  const updateProfile = useCallback(
    async (data: { name?: string; preferredLanguage?: string }) => {
      if (state.status !== "success") return;
      setState({ status: "updating", user: state.user });
      try {
        const user = await profileRepository.updateProfile(data);
        setState({ status: "success", user });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Profile:update_failed", { code: error.code });
        setState({ status: "error", error });
      }
    },
    [state, profileRepository, logger],
  );

  const logout = useCallback(async () => {
    try {
      await profileRepository.logout();
    } catch (e) {
      const error = toAppError(e);
      logger.error("Profile:logout_failed", { code: error.code });
    }
  }, [profileRepository, logger]);

  return { state, updateProfile, logout };
}
