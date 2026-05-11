import { getModRoles } from "./database.js";

export function hasModPermission(member) {
  if (!member) return false;
  if (member.permissions.has("Administrator")) return true;
  if (member.permissions.has("ManageGuild")) return true;
  if (member.id === member.guild.ownerId) return true;

  const modRoles = getModRoles(member.guild.id);
  if (modRoles.length === 0) return false;
  return member.roles.cache.some((role) => modRoles.includes(role.id));
}
