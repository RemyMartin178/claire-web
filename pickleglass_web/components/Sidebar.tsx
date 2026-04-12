'use client';

import React, { useState, useMemo, useCallback } from "react";
import { Sidebar as ShadcnSidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { HelpCircle, LogOut, Calendar, Settings } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, getSubscriptionDisplayName } from '@/hooks/useSubscription';
import { logout } from '@/utils/api';
import Avatar from '@/components/Avatar';
import { usePathname } from "next/navigation";
import { trackLogout } from '@/lib/gtag';

export default function Sidebar({ onSearchClick }: { onSearchClick?: () => void }) {
    const pathname = usePathname();
    const { user: userInfo, loading: authLoading } = useAuth();
    const subscription = useSubscription();
    const [open, setOpen] = useState(false);

    const isFirebaseUser = userInfo && userInfo.uid !== 'default_user';

    const handleDownloadClick = useCallback(() => {
        const scopedUserId = userInfo?.uid || userInfo?.email || 'anonymous';
        localStorage.setItem(`cl_downloaded:${scopedUserId}`, 'true');
        window.dispatchEvent(new CustomEvent('claire:download-clicked', {
            detail: { userId: scopedUserId }
        }));
    }, [userInfo?.uid, userInfo?.email]);

    const handleLogout = useCallback(async () => {
        try {
            trackLogout()
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

    const links = useMemo(() => {
        const baseLinks = [
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
                label: "Calendrier",
                href: "/calendar",
                icon: <Calendar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
            },
            {
                label: "Paramètres",
                href: "/settings",
                icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
            },
            {
                label: "Aide",
                href: "https://support.clairia.app",
                icon: <HelpCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
            }
        ];

        return baseLinks;
    }, [onSearchClick, userInfo?.email]);

    return (
        <ShadcnSidebar open={open} setOpen={setOpen}>
            <SidebarBody className="justify-between gap-10">
                <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                    <Logo open={open} />
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
                            href: "/api/download",
                            icon: <Image src="/download.svg" width={20} height={20} alt="Download" className="dark:invert w-5 h-5 shrink-0" />
                        }}
                        onClick={handleDownloadClick}
                        prefetch={false}
                        download
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
                        <div className="flex items-center justify-start gap-4 px-2 rounded-md h-[52px]">
                            <div className="flex items-center justify-center min-w-[24px] shrink-0">
                                <Avatar name={getUserDisplayName()} size="sm" />
                            </div>
                            <motion.div
                                animate={{
                                    display: open ? "block" : "none",
                                    opacity: open ? 1 : 0,
                                    width: open ? "auto" : 0,
                                }}
                                className="flex-1 min-w-0 overflow-hidden"
                            >
                                <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2">
                                    {getUserDisplayName()}
                                </div>
                                <div className="text-xs text-neutral-500 truncate whitespace-nowrap">
                                    {subscription?.isLoading ? '...' : getSubscriptionDisplayName(subscription?.plan)}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </SidebarBody>
        </ShadcnSidebar>
    );
}

export const Logo = ({ open }: { open?: boolean }) => {
    return (
        <Link
            href="/activity"
            className="font-normal flex gap-2 items-center justify-start text-sm text-black py-1 relative z-20 hover:no-underline"
        >
            <div className="flex items-center justify-center min-w-[36px]">
                <Image
                    src="/claire_logo-removebg-preview.png"
                    alt="Claire"
                    width={36}
                    height={36}
                    className="brightness-0 dark:invert object-contain shrink-0"
                />
            </div>
            <motion.span
                animate={{
                    opacity: open ? 1 : 0,
                    width: open ? "auto" : 0,
                    display: open ? "inline-block" : "none"
                }}
                className="font-medium text-base text-black dark:text-white whitespace-pre overflow-hidden"
            >
                Claire
            </motion.span>
        </Link>
    );
};
