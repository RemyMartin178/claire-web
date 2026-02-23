'use client';

import React, { useState, useMemo, useCallback } from "react";
import { Sidebar as ShadcnSidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { Database, HelpCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, getSubscriptionDisplayName } from '@/hooks/useSubscription';
import { logout } from '@/utils/api';
import Avatar from '@/components/Avatar';
import { usePathname } from "next/navigation";

export default function Sidebar({ onSearchClick }: { onSearchClick?: () => void }) {
    const pathname = usePathname();
    const { user: userInfo, loading: authLoading } = useAuth();
    const subscription = useSubscription();
    const [open, setOpen] = useState(false);

    const isFirebaseUser = userInfo && userInfo.uid !== 'default_user';

    const handleLogout = useCallback(async () => {
        try {
            await logout();
            window.location.href = '/auth/login';
        } catch (error) {
            console.error('An error occurred during logout:', error);
        }
    }, []);

    const getUserDisplayName = useCallback(() => {
        if (authLoading) return 'Chargement...';
        if (!userInfo) return 'Invité';
        if (userInfo.display_name) {
            const names = userInfo.display_name.split(' ');
            return names.length >= 2
                ? `${names[0]} ${names[1]}`
                : userInfo.display_name;
        }
        if (userInfo.email) return userInfo.email.split('@')[0];
        return 'Utilisateur';
    }, [userInfo, authLoading]);

    const links = useMemo(() => [
        {
            label: "Recherche",
            href: "#",
            icon: <Image src="/search.svg" width={20} height={20} alt="Search" className="dark:invert w-5 h-5 shrink-0" />,
            onClick: onSearchClick
        },
        {
            label: "Mon activité",
            href: "/activity",
            icon: <Image src="/activity.svg" width={20} height={20} alt="Activity" className="dark:invert w-5 h-5 shrink-0" />
        },
        {
            label: "Agents IA",
            href: "/ai-agents",
            icon: <Image src="/book.svg" width={20} height={20} alt="Agents" className="dark:invert w-5 h-5 shrink-0" />
        },
        {
            label: "Outils & Intégrations",
            href: "/tools",
            icon: <Database className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
        },
        {
            label: "Base de connaissances",
            href: "/knowledge-base",
            icon: <Image src="/book.svg" width={20} height={20} alt="Knowledge" className="dark:invert w-5 h-5 shrink-0" />
        },
        {
            label: "Aide",
            href: "/help",
            icon: <HelpCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
        },
        {
            label: "Paramètres",
            href: "/settings",
            icon: <Image src="/setting.svg" width={20} height={20} alt="Settings" className="dark:invert w-5 h-5 shrink-0" />
        }
    ], [onSearchClick]);

    return (
        <ShadcnSidebar open={open} setOpen={setOpen}>
            <SidebarBody className="justify-between gap-10">
                <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                    {open ? <Logo /> : <LogoIcon />}
                    <div className="mt-8 flex flex-col gap-2">
                        {links.map((link, idx) => (
                            <SidebarLink
                                key={idx}
                                link={{
                                    label: link.label,
                                    href: link.href,
                                    icon: link.icon
                                }}
                                onClick={link.onClick}
                                className={pathname.startsWith(link.href) && link.href !== "#" ? "bg-neutral-100 dark:bg-neutral-800" : ""}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <SidebarLink
                        link={{
                            label: "Télécharger Claire",
                            href: "/download",
                            icon: <Image src="/download.svg" width={20} height={20} alt="Download" className="dark:invert w-5 h-5 shrink-0" />
                        }}
                    />

                    {/* Logout Link */}
                    {isFirebaseUser ? (
                        <div onClick={handleLogout} className="cursor-pointer">
                            <SidebarLink
                                link={{
                                    label: "Déconnexion",
                                    href: "#",
                                    icon: <LogOut className="text-red-500 h-5 w-5 shrink-0" />
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            />
                        </div>
                    ) : (
                        <SidebarLink
                            link={{
                                label: "Connexion",
                                href: "/auth/login",
                                icon: <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0 transform -scale-x-100" />
                            }}
                        />
                    )}

                    {/* Profile Section */}
                    <div className="mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                        <Link href="/settings" className="block">
                            <div className={cn("flex items-center gap-3 py-2 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors", open ? "justify-start" : "justify-center")}>
                                <Avatar name={getUserDisplayName()} size="sm" />
                                {open && (
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2">
                                            {getUserDisplayName()}
                                        </div>
                                        <div className="text-xs text-neutral-500 truncate">
                                            {subscription?.isLoading ? '...' : getSubscriptionDisplayName(subscription?.plan)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Link>
                    </div>
                </div>
            </SidebarBody>
        </ShadcnSidebar>
    );
}

export const Logo = () => {
    return (
        <Link
            href="/activity"
            className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
        >
            <Image
                src="/claire_logo-removebg-preview.png"
                alt="Claire"
                width={30}
                height={30}
                className="brightness-0 dark:invert object-contain shrink-0"
            />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium text-black dark:text-white whitespace-pre"
            >
                Claire
            </motion.span>
        </Link>
    );
};

export const LogoIcon = () => {
    return (
        <Link
            href="/activity"
            className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20 justify-center"
        >
            <Image
                src="/claire_logo-removebg-preview.png"
                alt="Claire"
                width={30}
                height={30}
                className="brightness-0 dark:invert object-contain shrink-0"
            />
        </Link>
    );
};
