'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, createElement, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, Activity, Book, Settings, User, Shield, CreditCard, LogOut, ChevronDown, LucideIcon, MessageSquare, ChevronLeft, ChevronRight, Database, Download, HelpCircle } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { logout, checkApiKeyStatus } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, getSubscriptionDisplayName } from '@/hooks/useSubscription';

const ANIMATION_DURATION = {
    SIDEBAR: 500,
    TEXT: 300,
    SUBMENU: 500,
    ICON_HOVER: 200,
    COLOR_TRANSITION: 200,
    HOVER_SCALE: 200,
} as const;

const DIMENSIONS = {
    SIDEBAR_EXPANDED: 220,
    SIDEBAR_COLLAPSED: 64,
    ICON_SIZE: 18,
    USER_AVATAR_SIZE: 32,
    HEADER_HEIGHT: 64,
} as const;

const ANIMATION_DELAYS = {
    BASE: 0,
    INCREMENT: 50,
    TEXT_BASE: 250,
    SUBMENU_INCREMENT: 30,
} as const;

interface NavigationItem {
    name: string;
    href?: string;
    action?: () => void;
    icon: LucideIcon | string;
    isLucide: boolean;
    hasSubmenu?: boolean;
    ariaLabel?: string;
    isActive?: boolean;
}

interface SubmenuItem {
    name: string;
    href: string;
    icon: LucideIcon | string;
    isLucide: boolean;
    ariaLabel?: string;
}

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: (collapsed: boolean) => void;
    onSearchClick?: () => void;
}

interface AnimationStyles {
    text: React.CSSProperties;
    submenu: React.CSSProperties;
    sidebarContainer: React.CSSProperties;
    textContainer: React.CSSProperties;
}

const useAnimationStyles = (isCollapsed: boolean) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), ANIMATION_DURATION.SIDEBAR);
        return () => clearTimeout(timer);
    }, [isCollapsed]);

    const getTextAnimationStyle = useCallback(
        (delay = 0): React.CSSProperties => ({
            willChange: 'opacity',
            transition: `opacity ${ANIMATION_DURATION.TEXT}ms ease-out`,
            transitionDelay: `${delay}ms`,
            opacity: isCollapsed ? 0 : 1,
            pointerEvents: isCollapsed ? 'none' : 'auto',
        }),
        [isCollapsed]
    );

    const getSubmenuAnimationStyle = useCallback(
        (isExpanded: boolean): React.CSSProperties => ({
            willChange: 'opacity, max-height',
            transition: `all ${ANIMATION_DURATION.SUBMENU}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            maxHeight: isCollapsed || !isExpanded ? '0px' : '400px',
            opacity: isCollapsed || !isExpanded ? 0 : 1,
        }),
        [isCollapsed]
    );

    const sidebarContainerStyle: React.CSSProperties = useMemo(
        () => ({
            willChange: 'width',
            transition: `width ${ANIMATION_DURATION.SIDEBAR}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }),
        []
    );

    const getTextContainerStyle = useCallback(
        (): React.CSSProperties => ({
            width: isCollapsed ? '0px' : '150px',
            overflow: 'hidden',
            transition: `width ${ANIMATION_DURATION.SIDEBAR}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }),
        [isCollapsed]
    );

    const getUniformTextStyle = useCallback(
        (): React.CSSProperties => ({
            willChange: 'opacity',
            opacity: isCollapsed ? 0 : 1,
            transition: `opacity 300ms ease ${isCollapsed ? '0ms' : '200ms'}`,
            whiteSpace: 'nowrap' as const,
        }),
        [isCollapsed]
    );

    return {
        isAnimating,
        getTextAnimationStyle,
        getSubmenuAnimationStyle,
        sidebarContainerStyle,
        getTextContainerStyle,
        getUniformTextStyle,
    };
};

const IconComponent = memo<{
    icon: LucideIcon | string;
    isLucide: boolean;
    alt: string;
    className?: string;
}>(({ icon, isLucide, alt, className = 'h-[18px] w-[18px] transition-transform duration-200' }) => {
    if (isLucide) {
        return createElement(icon as LucideIcon, { className, 'aria-hidden': true });
    }

    return <Image src={icon as string} alt={alt} width={18} height={18} className={className} loading="lazy" />;
});

IconComponent.displayName = 'IconComponent';

const SidebarComponent = ({ isCollapsed, onToggle, onSearchClick }: SidebarProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(pathname.startsWith('/settings'));
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { user: userInfo, loading: authLoading } = useAuth();
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
    const subscription = useSubscription();

    const { isAnimating, getTextAnimationStyle, getSubmenuAnimationStyle, sidebarContainerStyle, getTextContainerStyle, getUniformTextStyle } =
        useAnimationStyles(isCollapsed);

    // Determine if the current user is a Firebase user (not a guest)
    const isFirebaseUser = userInfo && userInfo.uid !== 'default_user';

    useEffect(() => {
        checkApiKeyStatus()
            .then(status => setHasApiKey(status.hasApiKey))
            .catch(err => {
                console.error('Failed to check API key status:', err);
                setHasApiKey(null); // Set to null on error
            });
    }, []);

    useEffect(() => {
        if (pathname.startsWith('/settings')) {
            setIsSettingsExpanded(true);
        }
    }, [pathname]);

    // Fermer le menu profil au clic extérieur / escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsUserMenuOpen(false);
        };
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // si on clique en dehors du conteneur du menu, on ferme
            if (!target.closest('#sidebar-user-row') && !target.closest('#sidebar-user-menu')) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, []);

    const navigation = useMemo<NavigationItem[]>(
        () => {
            const baseNavigation = [
                {
                    name: 'Recherche',
                    action: onSearchClick,
                    icon: '/search.svg',
                    isLucide: false,
                    ariaLabel: 'Ouvrir la recherche',
                },
                {
                    name: 'Mon activité',
                    href: '/activity',
                    icon: '/activity.svg',
                    isLucide: false,
                    ariaLabel: 'Voir mon activité',
                },
                {
                    name: 'Agents IA',
                    href: '/ai-agents',
                    icon: '/book.svg',
                    isLucide: false,
                    ariaLabel: 'Gestion des agents IA',
                },
                {
                    name: 'Outils & Intégrations',
                    href: '/tools',
                    icon: Database,
                    isLucide: true,
                    ariaLabel: 'Outils et intégrations',
                },
                {
                    name: 'Base de connaissances',
                    href: '/knowledge-base',
                    icon: '/book.svg',
                    isLucide: false,
                    ariaLabel: 'Base de connaissances et documents',
                },
                {
                    name: 'Aide',
                    href: '/help',
                    icon: HelpCircle,
                    isLucide: true,
                    ariaLabel: 'Aide et support',
                },
                {
                    name: 'Paramètres',
                    href: '/settings',
                    icon: '/setting.svg',
                    isLucide: false,
                    hasSubmenu: true,
                    ariaLabel: 'Menu paramètres',
                },
            ];

            return baseNavigation;
        },
        [onSearchClick]
    );

    const settingsSubmenu = useMemo<SubmenuItem[]>(
        () => [
            { name: 'Compte', href: '/settings', icon: '/user.svg', isLucide: false, ariaLabel: 'Paramètres du compte' },
            { name: 'Modèles IA', href: '/settings/models', icon: '/setting.svg', isLucide: false, ariaLabel: 'Configuration des modèles IA' },
            { name: 'Confidentialité', href: '/settings/privacy', icon: '/privacy.svg', isLucide: false, ariaLabel: 'Paramètres des données et de la confidentialité' },
            { name: 'Facturation', href: '/settings/billing', icon: '/credit-card.svg', isLucide: false, ariaLabel: 'Paramètres de facturation' },
        ],
        []
    );

    const bottomItems = useMemo(
        () => [
            {
                href: '/download',
                icon: '/download.svg',
                text: 'Télécharger Claire',
                ariaLabel: 'Télécharger Claire',
            },
        ],
        []
    );

    const toggleSidebar = useCallback(() => {
        onToggle(!isCollapsed);
    }, [isCollapsed, onToggle]);

    const toggleSettings = useCallback(() => {
        setIsSettingsExpanded(prev => !prev);
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await logout();
            // Rediriger vers la page de connexion
            window.location.href = '/login';
        } catch (error) {
            console.error('An error occurred during logout:', error);
        }
    }, []);

    const handleKeyDown = useCallback((event: React.KeyboardEvent, action?: () => void) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            action?.();
        }
    }, []);

    const renderNavigationItem = useCallback(
        (item: NavigationItem, index: number) => {
            const isActive = item.href ? pathname.startsWith(item.href) : false;
            const animationDelay = 0;

            const baseButtonClasses = `
      group flex items-center rounded-[8px] px-[12px] py-[10px] text-[14px] text-[#282828] w-full relative
      transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
      focus:outline-none
    `;

            const getStateClasses = (isActive: boolean) =>
                isActive ? 'bg-[#f2f2f2] text-[#282828]' : 'text-[#282828] hover:text-[#282828] hover:bg-[#f7f7f7]';

            if (item.action) {
                return (
                    <li key={item.name}>
                        <button
                            onClick={item.action}
                            onKeyDown={e => handleKeyDown(e, item.action)}
                            className={`${baseButtonClasses} ${getStateClasses(false)}`}
                            title={isCollapsed ? item.name : undefined}
                            aria-label={item.ariaLabel || item.name}
                            style={{ willChange: 'background-color, color' }}
                        >
                            <div className="shrink-0 flex items-center justify-center w-5 h-5">
                                <IconComponent icon={item.icon} isLucide={item.isLucide} alt={`${item.name} icon`} />
                            </div>

                            <div className="ml-[12px] overflow-hidden" style={getTextContainerStyle()}>
                                <span className="block text-left" style={getUniformTextStyle()}>
                                    {item.name}
                                </span>
                            </div>
                        </button>
                    </li>
                );
            }

            if (item.hasSubmenu) {
                return (
                    <li key={item.name}>
                        <button
                            onClick={toggleSettings}
                            onKeyDown={e => handleKeyDown(e, toggleSettings)}
                            className={`${baseButtonClasses} ${getStateClasses(isActive)}`}
                            title={isCollapsed ? item.name : undefined}
                            aria-label={item.ariaLabel || item.name}
                            aria-expanded={isSettingsExpanded}
                            aria-controls="settings-submenu"
                            style={{ willChange: 'background-color, color' }}
                        >
                            <div className="shrink-0 flex items-center justify-center w-5 h-5">
                                <IconComponent icon={item.icon} isLucide={item.isLucide} alt={`${item.name} icon`} />
                            </div>

                            <div className="ml-[12px] overflow-hidden flex items-center" style={getTextContainerStyle()}>
                                <span className="flex-1 text-left" style={getUniformTextStyle()}>
                                    {item.name}
                                </span>
                                <ChevronDown
                                    className="h-3 w-3 ml-1.5 shrink-0"
                                    aria-hidden="true"
                                    style={{
                                        willChange: 'transform, opacity',
                                        transition: `all ${ANIMATION_DURATION.HOVER_SCALE}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                                        transform: `rotate(${isSettingsExpanded ? 180 : 0}deg) ${isCollapsed ? 'scale(0)' : 'scale(1)'}`,
                                        opacity: isCollapsed ? 0 : 1,
                                    }}
                                />
                            </div>
                        </button>

                        <div
                            id="settings-submenu"
                            className="overflow-hidden"
                            style={getSubmenuAnimationStyle(isSettingsExpanded)}
                            role="region"
                            aria-labelledby="settings-button"
                        >
                            <ul className="mt-[4px] space-y-0 pl-[22px]" role="menu">
                                {settingsSubmenu.map((subItem, subIndex) => (
                                    <li key={subItem.name} role="none">
                                        <Link
                                            href={subItem.href}
                                            className={`
                                  group flex items-center rounded-lg px-[12px] py-[8px] text-[13px] gap-x-[9px]
                      focus:outline-none
                                  ${
                                      pathname === subItem.href
                                          ? 'bg-subtle-active-bg text-[#282828]'
                                          : 'text-[#282828] hover:text-[#282828] hover:bg-[#f7f7f7]'
                                  }
                      transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
                                `}
                                            style={{
                                                willChange: 'background-color, color',
                                            }}
                                            role="menuitem"
                                            aria-label={subItem.ariaLabel || subItem.name}
                                        >
                                            <IconComponent
                                                icon={subItem.icon}
                                                isLucide={subItem.isLucide}
                                                alt={`${subItem.name} icon`}
                                                className="h-4 w-4 shrink-0"
                                            />
                                            <span className="whitespace-nowrap">{subItem.name}</span>
                                        </Link>
                                    </li>
                                ))}
                                <li role="none">
                                    {isFirebaseUser ? (
                                        <button
                                            onClick={handleLogout}
                                            onKeyDown={e => handleKeyDown(e, handleLogout)}
                                            className={`
                                    group flex items-center rounded-lg px-[12px] py-[8px] text-[13px] gap-x-[9px]
                                    text-red-600 hover:text-red-700 hover:bg-[#f7f7f7] w-full 
                                    transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
                                    focus:outline-none
                                  `}
                                            style={{ willChange: 'background-color, color' }}
                                            role="menuitem"
                                            aria-label="Déconnexion"
                                        >
                                            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span className="whitespace-nowrap">Déconnexion</span>
                                        </button>
                                    ) : (
                                        <Link
                                            href="/login"
                                            className={`
                                    group flex items-center rounded-lg px-[12px] py-[8px] text-[13px] gap-x-[9px] 
                                    text-[#282828] hover:text-[#282828] hover:bg-[#f7f7f7] w-full 
                                    transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
                                    focus:outline-none
                                  `}
                                            style={{ willChange: 'background-color, color' }}
                                            role="menuitem"
                                            aria-label="Connexion"
                                        >
                                            <LogOut className="h-3.5 w-3.5 shrink-0 transform -scale-x-100" aria-hidden="true" />
                                            <span className="whitespace-nowrap">Connexion</span>
                                        </Link>
                                    )}
                                </li>
                            </ul>
                        </div>
                    </li>
                );
            }

            return (
                <li key={item.name}>
                    <Link
                        href={item.href || '#'}
                        className={`
                        group flex items-center rounded-[8px] text-[14px] px-[12px] py-[10px] relative
            focus:outline-none
            ${getStateClasses(isActive)}
            transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
                        ${isCollapsed ? '' : ''}
                      `}
                        title={isCollapsed ? item.name : undefined}
                        aria-label={item.ariaLabel || item.name}
                        style={{ willChange: 'background-color, color' }}
                    >
                        <div className="shrink-0 flex items-center justify-center w-5 h-5">
                            <IconComponent icon={item.icon} isLucide={item.isLucide} alt={`${item.name} icon`} />
                        </div>

                        <div className="ml-[12px] overflow-hidden" style={getTextContainerStyle()}>
                            <span className="block text-left" style={getUniformTextStyle()}>
                                {item.name}
                            </span>
                        </div>
                    </Link>
                </li>
            );
        },
        [
            pathname,
            isCollapsed,
            isSettingsExpanded,
            toggleSettings,
            handleLogout,
            handleKeyDown,
            getUniformTextStyle,
            getTextContainerStyle,
            getSubmenuAnimationStyle,
            settingsSubmenu,
            isFirebaseUser,
        ]
    );

    const getUserDisplayName = useCallback(() => {
        if (authLoading) return 'Chargement...';
        if (!userInfo) return 'Invité';
        
        // Si on a un display_name, on l'utilise et on formate
        if (userInfo.display_name) {
            const names = userInfo.display_name.split(' ');
            if (names.length >= 2) {
                // Si on a au moins 2 mots, on prend les 2 premiers
                return `${names[0].charAt(0).toUpperCase() + names[0].slice(1).toLowerCase()} ${names[1].charAt(0).toUpperCase() + names[1].slice(1).toLowerCase()}`;
            } else {
                // Si un seul mot, on le met en majuscule
                return userInfo.display_name.charAt(0).toUpperCase() + userInfo.display_name.slice(1).toLowerCase();
            }
        }
        
        // Sinon on utilise l'email et on met en majuscules
        if (userInfo.email) {
            const name = userInfo.email.split('@')[0];
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
        
        return 'Utilisateur';
    }, [userInfo, authLoading]);

    const getUserInitial = useCallback(() => {
        if (authLoading) return 'L';
        if (!userInfo) return 'I';
        
        // Si on a un display_name, on prend la première lettre du premier nom
        if (userInfo.display_name) {
            const names = userInfo.display_name.split(' ');
            return names[0].charAt(0).toUpperCase();
        }
        
        // Sinon on utilise l'email
        if (userInfo.email) {
            const name = userInfo.email.split('@')[0];
            return name.charAt(0).toUpperCase();
        }
        
        return 'U';
    }, [userInfo, authLoading]);

    return (
        <aside
            className={`flex h-full flex-col bg-white border-r py-3 px-2 border-[#e5e5e5] relative ${isCollapsed ? 'w-[60px]' : 'w-[220px]'}`}
            style={sidebarContainerStyle}
            role="navigation"
            aria-label="main navigation"
            aria-expanded={!isCollapsed}
            suppressHydrationWarning
        >
            <header className={`group relative h-6 flex shrink-0 items-center justify-end px-2`} suppressHydrationWarning>
                <button
                    onClick={toggleSidebar}
                    onKeyDown={e => handleKeyDown(e, toggleSidebar)}
                    className="text-gray-500 hover:text-gray-800 p-1 rounded-[4px] hover:bg-[#f7f7f7] h-6 w-6 transition-colors focus:outline-none"
                    aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
                    suppressHydrationWarning
                >
                    <Image 
                        src="/unfold.svg" 
                        alt={isCollapsed ? "Open" : "Close"} 
                        width={16} 
                        height={16} 
                        className={isCollapsed ? "" : "transform rotate-180"} 
                    />
                </button>
            </header>

            <nav className="flex flex-1 flex-col pt-8" role="navigation" aria-label="Main menu">
                <ul role="list" className="flex flex-1 flex-col">
                    <li>
                        <ul role="list" className="">
                            {navigation.map(renderNavigationItem)}
                        </ul>
                    </li>
                </ul>

                {/* Download link */}
                <div className="mt-auto py-1.5" role="navigation" aria-label="Liens supplémentaires">
                    {bottomItems.map((item, index) => (
                        <Link
                            key={item.text}
                            href={item.href}
                            className={`
                group flex items-center rounded-[6px] px-[12px] py-[8px] text-[13px] text-[#282828]
                hover:text-[#282828] hover:bg-[#f7f7f7] ${isCollapsed ? '' : 'gap-x-[10px]'}
                transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out 
                focus:outline-none
              `}
                            title={isCollapsed ? item.text : undefined}
                            aria-label={item.ariaLabel}
                            style={{ willChange: 'background-color, color' }}
                        >
                            <div className="overflow-hidden">
                                <span className="" style={getUniformTextStyle()}>
                                    {item.text}
                                </span>
                            </div>
                            <div className="shrink-0 flex items-center justify-center w-4 h-4">
                                <IconComponent
                                    icon={item.icon}
                                    isLucide={false}
                                    alt={`${item.text} icon`}
                                    className={`h-[16px] w-[16px] transition-transform duration-${ANIMATION_DURATION.ICON_HOVER}`}
                                />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* User profile section - static, no menu */}
                <div className="py-3 px-2 border-t border-[#e5e5e5]">
                    {isCollapsed ? (
                        <div className="flex items-center justify-center">
                            <Avatar name={getUserDisplayName()} size="sm" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 px-2">
                            <Avatar name={getUserDisplayName()} size="sm" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#282828] truncate">
                                    {getUserDisplayName()}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    {subscription.isLoading ? '...' : getSubscriptionDisplayName(subscription.plan)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </nav>
        </aside>
    );
};

const Sidebar = memo(SidebarComponent);
Sidebar.displayName = 'Sidebar';

export default Sidebar;
