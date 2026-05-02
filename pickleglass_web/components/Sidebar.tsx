'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sidebar as ShadcnSidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { HelpCircle, LogOut, Calendar, Settings, User, Palette } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, getSubscriptionDisplayName } from '@/hooks/useSubscription';
import { logout } from '@/utils/api';
import Avatar from '@/components/Avatar';
import { usePathname, useRouter } from "next/navigation";
import { trackLogout } from '@/lib/gtag';
import { getElectronLoginPath, useElectronRuntime } from '@/utils/electron';

export default function Sidebar({ onSearchClick }: { onSearchClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user: userInfo, loading: authLoading } = useAuth();
    const subscription = useSubscription();
    const [open, setOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const isElectronRuntime = useElectronRuntime();

    const isFirebaseUser = userInfo && userInfo.uid !== 'default_user';

    // Close profile menu on outside click or ESC
    useEffect(() => {
        if (!profileMenuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setProfileMenuOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setProfileMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [profileMenuOpen]);

    const handleDownloadClick = useCallback(() => {
        const scopedUserIds = Array.from(new Set([userInfo?.uid, userInfo?.email, 'anonymous'].filter(Boolean)));
        scopedUserIds.forEach((scopedUserId) => {
            localStorage.setItem(`cl_downloaded:${scopedUserId}`, 'true');
        });
        window.dispatchEvent(new CustomEvent('claire:download-clicked', {
            detail: { scopedIds: scopedUserIds }
        }));
    }, [userInfo?.uid, userInfo?.email]);

    const handleLogout = useCallback(async () => {
        try {
            trackLogout()
            await logout();
            window.location.href = isElectronRuntime === true ? getElectronLoginPath() : '/auth/login';
        } catch (error) {
            console.error('An error occurred during logout:', error);
        }
    }, [isElectronRuntime]);

    const getUserDisplayName = useCallback(() => {
        if (authLoading) return 'Chargement...';
        if (!userInfo) return 'Invite';
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
                label: "Mon activite",
                href: "/activity",
                icon: <Image src="/activity.svg" width={20} height={20} alt="Activity" className="dark:invert w-5 h-5 shrink-0" />
            },
            {
                label: "Calendrier",
                href: "/calendar",
                icon: <Calendar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
            },
            {
                label: "Parametres",
                href: "/settings",
                icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
            },
            {
                label: "Aide",
                href: "https://support.clairia.app",
                icon: <HelpCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />
            }
        ];

        if (isElectronRuntime === true) {
            return baseLinks;
        }

        return [
            ...baseLinks,
            {
                label: "Telecharger Claire",
                href: "/api/download",
                icon: <Image src="/download.svg" width={20} height={20} alt="Download" className="dark:invert w-5 h-5 shrink-0" />,
                onClick: handleDownloadClick
            }
        ];
    }, [handleDownloadClick, isElectronRuntime, onSearchClick]);

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
                    <div className="mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-2 relative" ref={profileMenuRef}>
                        {/* Profile dropdown menu */}
                        {profileMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50 overflow-hidden"
                                style={{ animation: 'profileMenuIn 0.12s ease-out' }}
                            >
                                <style>{`@keyframes profileMenuIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                                <button
                                    onClick={() => { setProfileMenuOpen(false); router.push('/profile'); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                                >
                                    <User className="h-4 w-4 shrink-0 text-neutral-500" />
                                    Profil
                                </button>
                                <button
                                    onClick={() => { setProfileMenuOpen(false); window.dispatchEvent(new CustomEvent('claire:open-settings', { detail: { tab: 'profile' } })); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                                >
                                    <Settings className="h-4 w-4 shrink-0 text-neutral-500" />
                                    Paramètres
                                </button>
                                <button
                                    onClick={() => { setProfileMenuOpen(false); router.push('/settings/personalize'); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                                >
                                    <Palette className="h-4 w-4 shrink-0 text-neutral-500" />
                                    Personnalisation
                                </button>
                                <button
                                    onClick={() => {
                                        setProfileMenuOpen(false);
                                        const api = (window as any).api;
                                        if (api?.common?.openExternal) {
                                            void api.common.openExternal('https://support.clairia.app');
                                        } else {
                                            window.open('https://support.clairia.app', '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                                >
                                    <HelpCircle className="h-4 w-4 shrink-0 text-neutral-500" />
                                    Aide
                                </button>
                                <div className="h-px bg-neutral-100 dark:bg-neutral-800 mx-2" />
                                <button
                                    onClick={() => { setProfileMenuOpen(false); void handleLogout(); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    Déconnexion
                                </button>
                            </div>
                        )}

                        {/* Avatar trigger */}
                        <button
                            onClick={() => setProfileMenuOpen(v => !v)}
                            className="flex items-center justify-start gap-4 px-2 rounded-md h-[52px] w-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <div className="flex items-center justify-center min-w-[24px] shrink-0">
                                <Avatar name={getUserDisplayName()} size="sm" />
                            </div>
                            <motion.div
                                animate={{
                                    display: open ? "block" : "none",
                                    opacity: open ? 1 : 0,
                                    width: open ? "auto" : 0,
                                }}
                                className="flex-1 min-w-0 overflow-hidden text-left"
                            >
                                <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2">
                                    {getUserDisplayName()}
                                </div>
                                <div className="text-xs text-neutral-500 truncate whitespace-nowrap">
                                    {subscription?.isLoading ? '...' : getSubscriptionDisplayName(subscription?.plan)}
                                </div>
                            </motion.div>
                        </button>
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
