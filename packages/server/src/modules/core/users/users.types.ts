import type { Role } from "../auth/roles";

/**
 *
 */
export type CreateUserInput = {
  name: string;
  email: string;
  role: Role;
  initialPassword: string;
  primaryGroupId?: string;
};

/**
 *
 */
export type UpdateUserInput = {
  name?: string;
  email?: string;
};

/**
 *
 */
export type UpdateUserRoleInput = {
  role: Role;
};

/**
 *
 */
export type UserDetailDto = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string | null;
  status: string;
  createdBy: string | null;
  disabledAt: string | null;
  passwordSetAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 *
 */
export type ResetPasswordResultDto = {
  temporaryPassword: string;
};

/**
 *
 */
export type AddGroupMemberInput = {
  userId: string;
  isPrimary?: boolean;
};
