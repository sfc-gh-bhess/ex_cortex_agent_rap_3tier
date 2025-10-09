export const USERNAME_COOKIE = "demo_username";

export function getUsernameFromCookie(): string | null {
	if (typeof document === "undefined") return null;
	const cookie = document.cookie || "";
	const parts = cookie.split(";").map((c) => c.trim());
	for (const part of parts) {
		if (part.startsWith(`${USERNAME_COOKIE}=`)) {
			return decodeURIComponent(part.split("=")[1] || "");
		}
	}
	return null;
}
