'use client';

import { Button } from './ui/button';
import { PlusIcon } from './icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import React from 'react';
import { getUsernameFromCookie } from '@/lib/auth/currentUser';

export function ChatHeader() {

	const [username, setUsername] = React.useState<string | null>(null);

	React.useEffect(() => {
		setUsername(getUsernameFromCookie());
	}, []);

	const handleLogout = async () => {
		try {
			const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
			await fetch(`${backendUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
			window.location.href = '/login';
		} catch {}
	};

	return (
		<header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							className="md:px-2 px-2 md:h-fit"
							onClick={() => {
								window.location.reload();
							}}
						>
							<PlusIcon />
							<span>New Chat</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>New Chat</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<div className="ml-auto flex items-center gap-2">
				{username ? (
					<span className="text-sm text-muted-foreground">Hi, {username}!</span>
				) : null}
				<Button
					variant="outline"
					onClick={handleLogout}
				>
					Logout
				</Button>
			</div>
		</header>
	);
}