"use client"

import React from "react";
import { useRouter } from "next/navigation";
import { demoUsers } from "@/lib/auth/demoUsers";

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
            const res = await fetch(`${backendUrl}/auth/login`, {
				method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});
			if (!res.ok) {
				const data = await res.json();
				setError(data.error || "Login failed");
				setIsLoading(false);
				return;
			}
			router.replace("/");
		} catch (e) {
			setError("Network error");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-dvh items-center justify-center p-4">
			<form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 border rounded-md p-4 bg-background">
				<h1 className="text-xl font-semibold">Demo Login</h1>
				<label className="block text-sm">Username</label>
				<input
					type="text"
					className="w-full border rounded px-2 py-1"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					list="demo-users"
					placeholder="e.g. Alice"
					required
				/>
				<datalist id="demo-users">
					{demoUsers.map((u) => (
						<option key={u} value={u} />
					))}
				</datalist>

				<label className="block text-sm">Password</label>
				<input
					type="password"
					className="w-full border rounded px-2 py-1"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Same as username"
					required
				/>
				{error ? <p className="text-sm text-red-600">{error}</p> : null}
				<button
					type="submit"
					className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
					disabled={isLoading}
				>
					{isLoading ? "Logging in..." : "Log in"}
				</button>
				<p className="text-xs text-muted-foreground">Allowed users: {demoUsers.join(", ")}</p>
			</form>
		</div>
	);
}
