/** Shared ui-avatars.com fallback avatar URL. */
export function avatarUrl(
  name: string,
  size = 128,
  background = "262626",
): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=${background}&color=fff`;
}
