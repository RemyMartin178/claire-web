'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, createElement, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, Activity, Book, Settings, User, Shield, CreditCard, LogOut, ChevronDown, LucideIcon, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import ProfileMenu from '@/components/sidebar/ProfileMenu';

import Avatar from '@/components/Avatar';
import { logout, checkApiKeyStatus } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const ANIMATION_DURATION = {
    SIDEBAR: 300,
    TEXT: 200,
    SUBMENU: 300,
    ICON_HOVER: 200,
    COLOR_TRANSITION: 200,
    HOVER_SCALE: 200,
} as const;

const DIMENSIONS = {
    SIDEBAR_EXPANDED: 220,
    SIDEBAR_COLLAPSED: 64,
    ICON_SIZE: 20, // ChatGPT uses 20px icons
    USER_AVATAR_SIZE: 24, // ChatGPT profile avatar is 24px
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
            transition: `width ${ANIMATION_DURATION.SIDEBAR}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        }),
        []
    );

    const getTextContainerStyle = useCallback(
        (): React.CSSProperties => ({
            width: isCollapsed ? '0px' : '140px',
            overflow: 'hidden',
            transition: `width ${ANIMATION_DURATION.SIDEBAR}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        }),
        [isCollapsed]
    );

    const getUniformTextStyle = useCallback(
        (): React.CSSProperties => ({
            willChange: 'opacity',
            opacity: isCollapsed ? 0 : 1,
            transition: `opacity ${ANIMATION_DURATION.TEXT}ms ease ${isCollapsed ? '0ms' : '100ms'}`,
            whiteSpace: 'nowrap' as const,
            pointerEvents: isCollapsed ? 'none' : 'auto',
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
}>(({ icon, isLucide, alt, className = 'h-5 w-5 transition-transform duration-200' }) => {
    if (isLucide) {
        return createElement(icon as LucideIcon, { className, 'aria-hidden': true });
    }

    // Détection du format d'image
    const isImage = typeof icon === 'string' && (icon.endsWith('.svg') || icon.endsWith('.png') || icon.endsWith('.jpg') || icon.endsWith('.jpeg') || icon.endsWith('.webp'));
    // On applique le filtre invert seulement pour SVG et PNG (pour le thème sombre)
    const shouldInvert = typeof icon === 'string' && (icon.endsWith('.svg') || icon.endsWith('.png'));
    return isImage ? (
        <Image src={icon as string} alt={alt} width={18} height={18} className={shouldInvert ? `${className} filter invert` : className} loading="lazy" />
    ) : null;
});

IconComponent.displayName = 'IconComponent';

const SidebarComponent = ({ isCollapsed, onToggle, onSearchClick }: SidebarProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(pathname.startsWith('/settings'));
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { user: userInfo, loading: authLoading } = useAuth();
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

    const { isAnimating, getTextAnimationStyle, getSubmenuAnimationStyle, sidebarContainerStyle, getTextContainerStyle, getUniformTextStyle } =
        useAnimationStyles(isCollapsed);

    

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
                     name: 'Mon activité',
                     href: '/activity',
                     icon: Activity,
                     isLucide: true,
                     ariaLabel: 'Voir mon activité',
                 },
                 {
                     name: 'Personnaliser',
                     href: '/personalize',
                     icon: Book,
                     isLucide: true,
                     ariaLabel: 'Paramètres de personnalisation',
                 },
                 // Bouton Paramètres retiré du menu principal, déplacé dans le menu profil bas de sidebar
             ];

            // Admin section removed - no longer needed

            return baseNavigation;
        },
        [onSearchClick, userInfo?.email, authLoading]
    );

    const settingsSubmenu = useMemo<SubmenuItem[]>(
        () => [
            { name: 'Profil personnel', href: '/settings', icon: User, isLucide: true, ariaLabel: 'Paramètres du profil personnel' },
            { name: 'Confidentialité', href: '/settings/privacy', icon: Shield, isLucide: true, ariaLabel: 'Paramètres des données et de la confidentialité' },
            { name: 'Facturation', href: '/settings/billing', icon: CreditCard, isLucide: true, ariaLabel: 'Paramètres de facturation' },
        ],
        []
    );

    const bottomItems = useMemo(
        () => [
            {
                href: 'https://example.com/telecharger-claire', // Remplacer par le vrai lien de téléchargement
                icon: '/download.svg',
                text: 'Télécharger Claire',
                ariaLabel: 'Télécharger Claire (nouvelle fenêtre)',
            },
        ],
        []
    );

    const toggleSidebar = useCallback(() => {
        onToggle(!isCollapsed);
    }, [isCollapsed, onToggle]);

    const toggleSettings = useCallback(() => {
        if (!pathname.startsWith('/settings')) {
            setIsSettingsExpanded(prev => !prev);
        }
    }, [pathname]);

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
            let isActive = false;
            if (item.name === 'Accueil') {
                isActive = pathname === '/';
            } else {
                isActive = item.href ? pathname.startsWith(item.href) : false;
            }
            const animationDelay = 0;

            const baseButtonClasses = `
      group flex items-center rounded-[8px] px-[12px] py-[10px] text-[13px] text-white w-full relative
      transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
      focus:outline-none
    `;

            const getStateClasses = (isActive: boolean) =>
                isActive ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]' : 'text-white/80 hover:text-white hover:bg-white/5';

            if (item.action) {
                return (
                    <li key={item.name}>
                        <button
                            onClick={item.action}
                            onKeyDown={e => handleKeyDown(e, item.action)}
                            className={`${baseButtonClasses} ${getStateClasses(false)} h-9 touch:h-10`}
                            title={isCollapsed ? item.name : undefined}
                            aria-label={item.ariaLabel || item.name}
                            style={{ willChange: 'background-color, color' }}
                        >
                            <div className="shrink-0 flex items-center justify-center">
                                <IconComponent icon={item.icon} isLucide={item.isLucide} alt={`${item.name} icon`} className="h-5 w-5" />
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
                            className={`${baseButtonClasses} ${getStateClasses(isActive)} h-9 touch:h-10`}
                            title={isCollapsed ? item.name : undefined}
                            aria-label={item.ariaLabel || item.name}
                            aria-expanded={isSettingsExpanded}
                            aria-controls="settings-submenu"
                            style={{ willChange: 'background-color, color' }}
                        >
                            <div className="shrink-0 flex items-center justify-center">
                                <IconComponent icon={item.icon} isLucide={item.isLucide} alt={`${item.name} icon`} className="h-5 w-5" />
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
                                    group flex items-center rounded-lg px-[12px] py-[8px] text-[13px] gap-x-[9px] w-full text-left
                        focus:outline-none
                                    ${
                                        pathname === subItem.href
                                            ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
                                            : 'text-white/80 hover:text-white hover:bg-white/5'
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
                                        <button
                                        onClick={handleLogout}
                                            className={`
                                    group flex items-center rounded-lg px-[12px] py-[8px] text-[13px] gap-x-[9px]
                                    text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full 
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
                            group flex items-center rounded-lg text-sm 
                            ${isCollapsed 
                                ? 'w-9 h-9 justify-center items-center mx-auto -ml-1' 
                                : 'px-2 py-2 w-full'
                            } 
                            h-9 touch:h-10
                            focus:outline-none
                            ${getStateClasses(isActive)}
                            transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
                        `}
                        title={isCollapsed ? item.name : undefined}
                        aria-label={item.ariaLabel || item.name}
                        style={{ willChange: 'background-color, color' }}
                    >
                        <div className="flex items-center justify-center">
                            <IconComponent 
                                icon={item.icon} 
                                isLucide={item.isLucide} 
                                alt={`${item.name} icon`} 
                                className="h-5 w-5" 
                            />
                        </div>

                        {!isCollapsed && (
                            <div className="ml-3 overflow-hidden">
                                <span className="block text-left" style={getUniformTextStyle()}>
                                    {item.name}
                                </span>
                            </div>
                        )}
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
            userInfo,
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

    const isFirebaseUser = userInfo && userInfo.uid !== 'default_user';

    return (
        <aside
            className={`flex h-full flex-col bg-white/7 backdrop-blur-md py-3 px-0 relative shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] ${isCollapsed ? 'w-[64px]' : 'w-[220px]'}`}
            style={{
                ...sidebarContainerStyle,
                backgroundImage: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.02) 0%, transparent 70%)'
            }}
            role="navigation"
            aria-label="main navigation"
            aria-expanded={!isCollapsed}
        >
            <header className={`group relative h-6 flex shrink-0 items-center justify-between`}>
                {isCollapsed ? (
                    <Link href="/" className="flex items-center">
                        <Image src="/word.png" alt="Claire" width={20} height={20} className="mx-3 shrink-0" />
                    </Link>
                ) : (
                    <>
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/word.png"
                                alt="Claire Logo"
                                width={50}
                                height={14}
                                className="mx-3 shrink-0"
                            />
                        </Link>
                        <button
                            onClick={toggleSidebar}
                            onKeyDown={e => handleKeyDown(e, toggleSidebar)}
                            className="text-white/60 hover:text-white p-1 rounded-[8px] hover:bg-white/10 h-9 w-9 transition-colors focus:outline-none flex items-center justify-center"
                            aria-label="Fermer la barre latérale"
                        >
                            <Image src="/unfold.svg" alt="Close" width={20} height={20} className="h-5 w-5 transform rotate-180" />
                        </button>
                    </>
                )}
            </header>

            <nav
                className={`flex flex-1 flex-col text-text-main ${isCollapsed ? 'items-center pt-12' : 'pt-12'}`}
                role="navigation"
                aria-label="Historique de chat"
            >
                <ul role="list" className={`flex flex-1 flex-col ${isCollapsed ? 'items-center' : ''}`}>
                    <li>
                        <ul role="list" className="">
                            {navigation.map(renderNavigationItem)}
                        </ul>
                    </li>
                </ul>

                



                <div className="mt-auto py-1.5" role="navigation" aria-label="Liens supplémentaires">
                    {isCollapsed && (
                        <div className="mb-3 flex items-center justify-center">
                            <button
                                onClick={toggleSidebar}
                                onKeyDown={e => handleKeyDown(e, toggleSidebar)}
                                className="group flex items-center rounded-[8px] px-[12px] py-[10px] text-[13px] text-white w-full relative transition-colors duration-200 ease-out focus:outline-none text-white/80 hover:text-white hover:bg-white/5 h-9 touch:h-10"
                                aria-label="Ouvrir la barre latérale"
                            >
                                <div className="shrink-0 flex items-center justify-center w-5 h-5">
                                    <Image src="/unfold.svg" alt="Open" width={20} height={20} className="h-5 w-5" />
                                </div>
                            </button>
                        </div>
                    )}
                    {bottomItems.map((item, index) => (
                        <Link
                            key={item.text}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                group ${isCollapsed ? 'h-9 w-9 inline-flex items-center justify-center rounded-lg ml-1' : 'flex items-center rounded-[6px] px-[12px] py-[8px] gap-x-[10px]'}
                text-[13px] text-white/80 hover:text-white hover:bg-white/5
                transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out focus:outline-none
              `}
                            title={item.text}
                            aria-label={item.ariaLabel}
                            style={{ willChange: 'background-color, color' }}
                        >
                            {!isCollapsed && (
                                <span style={getUniformTextStyle()}>{item.text}</span>
                            )}
                            <div className={`${isCollapsed ? '' : 'shrink-0 flex items-center justify-center w-4 h-4'}`}>
                                <IconComponent
                                    icon={item.icon}
                                    isLucide={false}
                                    alt={`${item.text} icon`}
                                    className={`h-5 w-5 transition-transform duration-${ANIMATION_DURATION.ICON_HOVER} filter invert`}
                                />
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-[0px] flex items-center w-full h-[1px] px-[4px] mt-[8px] mb-[8px]">
                    <div className="w-full h-[1px] bg-white/20"></div>
                </div>

                <div className="mt-[0px]">
                    {isCollapsed ? (
                        <div className="flex items-center justify-center py-2">
                            <Avatar name={getUserDisplayName()} size="sm" />
                        </div>
                    ) : (
                        <ProfileMenu
                            onLogout={handleLogout}
                            name={getUserDisplayName()}
                            email={userInfo?.email || 'user@example.com'}
                            plan={hasApiKey ? 'Claire Pro' : 'Claire Gratuit'}
                            sidebarWidthPx={isCollapsed ? 64 : 260}
                            isSidebarCollapsed={isCollapsed}
                        />
                    )}
                </div>
                

            </nav>
        </aside>
    );
};

const Sidebar = memo(SidebarComponent);
Sidebar.displayName = 'Sidebar';

export default Sidebar;
