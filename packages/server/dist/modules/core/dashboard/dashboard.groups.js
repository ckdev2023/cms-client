/**
 * 指定ユーザーが指定 group のアクティブメンバーか判定する。
 *
 * @param tx テナント分離済みトランザクション。
 * @param userId ユーザー ID。
 * @param groupId グループ ID。
 * @returns メンバーなら true。
 */
export async function isGroupMember(tx, userId, groupId) {
  const result = await tx.query(
    `select exists(
      select 1 from user_group_memberships m
      join groups g on g.id = m.group_id
      where m.user_id = $1
        and m.group_id = $2
        and m.active_flag = true
        and g.active_flag = true
    ) as exists`,
    [userId, groupId],
  );
  return result.rows[0]?.exists;
}
/**
 * ユーザーの primary group ID を返す（primary 優先、次に参加日時順）。
 *
 * @param tx テナント分離済みトランザクション。
 * @param userId ユーザー ID。
 * @returns primary group ID、未所属なら undefined。
 */
export async function findPrimaryGroupId(tx, userId) {
  const result = await tx.query(
    `select m.group_id
     from user_group_memberships m
     join groups g on g.id = m.group_id
     where m.user_id = $1
       and m.active_flag = true
       and g.active_flag = true
     order by m.is_primary_group desc, m.joined_at asc
     limit 1`,
    [userId],
  );
  return result.rows[0]?.group_id;
}
/**
 * ユーザーが所属する active group 一覧を返す。
 *
 * @param tx テナント分離済みトランザクション。
 * @param userId ユーザー ID。
 * @returns group 選項列表。
 */
export async function loadUserGroups(tx, userId) {
  const result = await tx.query(
    `select g.id, g.name, m.is_primary_group
     from user_group_memberships m
     join groups g on g.id = m.group_id
     where m.user_id = $1
       and m.active_flag = true
       and g.active_flag = true
     order by m.is_primary_group desc, g.name asc`,
    [userId],
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    isPrimary: r.is_primary_group,
    isMember: true,
  }));
}
/**
 * テナント内の全 active group を返す。
 *
 * @param tx テナント分離済みトランザクション。
 * @returns group の id と name。
 */
export async function loadOrgActiveGroups(tx) {
  const result = await tx.query(
    `select g.id, g.name from groups g
     where g.active_flag = true order by g.name asc`,
    [],
  );
  return result.rows;
}
//# sourceMappingURL=dashboard.groups.js.map
