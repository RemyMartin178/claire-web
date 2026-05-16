import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

import MainHeader from '../react/MainHeader.jsx';
import PermissionHeader from '../react/PermissionHeader.jsx';
import TutorialHeader from '../react/TutorialHeader.jsx';

function getTutorialDoneKey(userState) {
    const uid = userState?.uid || userState?.user?.uid || 'anonymous';
    return `cl_tutorial_done:${uid}`;
}

function HeaderApp() {
    const [currentHeader, setCurrentHeader] = useState(null);
    const currentHeaderRef = useRef(null);

    useEffect(() => {
        currentHeaderRef.current = currentHeader;
    }, [currentHeader]);

    useEffect(() => {
        if (!window.api?.mainHeader?.setHeaderClickThrough) return;
        if (currentHeader === 'main') return;
        window.api.mainHeader.setHeaderClickThrough(false).catch(() => {});
    }, [currentHeader]);

    const resizeForMain = useCallback(() => {
        if (!window.api) return Promise.resolve();
        console.log('[HeaderController] resizing to 580x60 (main)');
        return window.api.headerController.resizeHeaderWindow({ width: 580, height: 60 }).catch(() => {});
    }, []);

    const resizeForPermission = useCallback(() => {
        if (!window.api) return Promise.resolve();
        console.log('[HeaderController] resizing to 285x220 (permission)');
        return window.api.headerController.resizeHeaderWindow({ width: 285, height: 220 }).catch(() => {});
    }, []);

    const resizeForTutorial = useCallback(() => {
        if (!window.api) return Promise.resolve();
        console.log('[HeaderController] resizing to 400x430 (tutorial)');
        return window.api.headerController.resizeHeaderWindow({ width: 400, height: 430 }).catch(() => {});
    }, []);

    const notifyHeaderState = useCallback((type) => {
        const state = type === 'permission' ? 'permission' : (type || 'main');
        if (window.api) {
            window.api.headerController.sendHeaderStateChanged(state);
        }
    }, []);

    const ensureHeader = useCallback((type) => {
        if (currentHeaderRef.current === type) {
            console.log('[HeaderController] ensureHeader: already showing', type);
            return;
        }
        console.log('[HeaderController] ensureHeader: switching to', type);
        setCurrentHeader(type);
        currentHeaderRef.current = type;
        notifyHeaderState(type);
    }, [notifyHeaderState]);

    const checkPermissions = useCallback(async () => {
        if (!window.api) return { success: true };
        try {
            const permissions = await window.api.headerController.checkSystemPermissions();
            console.log('[HeaderController] permissions:', permissions);
            if (!permissions.needsSetup) return { success: true };
            return { success: false, error: 'Permissions required' };
        } catch (error) {
            console.error('[HeaderController] checkPermissions error:', error);
            return { success: false, error: 'Failed to check permissions' };
        }
    }, []);

    const transitionToMainHeader = useCallback(async () => {
        if (currentHeaderRef.current === 'main') {
            await resizeForMain();
            return;
        }
        await resizeForMain();
        ensureHeader('main');
    }, [resizeForMain, ensureHeader]);

    const transitionToTutorialHeader = useCallback(async () => {
        if (currentHeaderRef.current === 'tutorial') return;
        await resizeForTutorial();
        ensureHeader('tutorial');
    }, [resizeForTutorial, ensureHeader]);

    const transitionToPermissionHeader = useCallback(async () => {
        if (currentHeaderRef.current === 'permission') {
            console.log('[HeaderController] already showing permission, skipping');
            return;
        }

        if (window.api) {
            try {
                const permissionsCompleted = await window.api.headerController.checkPermissionsCompleted();
                if (permissionsCompleted) {
                    console.log('[HeaderController] permissions previously completed, re-checking');
                    const permissionResult = await checkPermissions();
                    if (permissionResult.success) {
                        transitionToMainHeader();
                        return;
                    }
                    console.log('[HeaderController] permissions were revoked, showing setup again');
                }
            } catch (error) {
                console.error('[HeaderController] error checking permissionsCompleted:', error);
            }
        }

        await resizeForPermission();
        ensureHeader('permission');
    }, [checkPermissions, transitionToMainHeader, resizeForPermission, ensureHeader]);

    const handleStateUpdate = useCallback(async (userState) => {
        const { isLoggedIn } = userState;
        console.log('[HeaderController] handleStateUpdate isLoggedIn:', isLoggedIn);

        const manuallyLoggedOut = localStorage.getItem('manuallyLoggedOut') === 'true';
        if (manuallyLoggedOut && !isLoggedIn) {
            console.log('[HeaderController] manually logged out - going straight to main');
            localStorage.removeItem('manuallyLoggedOut');
            transitionToMainHeader();
            return;
        }

        if (isLoggedIn) {
            const permissionResult = await checkPermissions();
            if (!permissionResult.success) {
                transitionToPermissionHeader();
                return;
            }
            // Tutorial is disabled — new accounts go straight to the floating bar.
            // The Cluely-parity onboarding does not include the "Démarrer Claire"
            // welcome card. We mark it done so we never re-trigger the legacy flow.
            try { localStorage.setItem(getTutorialDoneKey(userState), 'true'); } catch (_) {}
        }

        transitionToMainHeader();
    }, [checkPermissions, transitionToMainHeader, transitionToPermissionHeader, transitionToTutorialHeader]);

    useEffect(() => {
        async function bootstrap() {
            if (window.api) {
                const userState = await window.api.common.getCurrentUser();
                console.log('[HeaderController] bootstrap userState:', userState);
                handleStateUpdate(userState);
            } else {
                ensureHeader('main');
            }
        }

        bootstrap();

        if (!window.api) return;

        const unsubUserState = window.api.headerController.onUserStateChanged((event, userState) => {
            console.log('[HeaderController] onUserStateChanged:', userState);
            handleStateUpdate(userState);
        });

        const unsubAuthFailed = window.api.headerController.onAuthFailed((event, { message }) => {
            console.error('[HeaderController] auth failed:', message);
        });

        return () => {
            if (typeof unsubUserState === 'function') unsubUserState();
            if (typeof unsubAuthFailed === 'function') unsubAuthFailed();
        };
    }, [handleStateUpdate, ensureHeader, transitionToMainHeader]);

    if (currentHeader === null) {
        return null;
    }

    if (currentHeader === 'permission') {
        // After permissions are granted, skip the tutorial card and go straight
        // to the floating bar (Cluely-parity onboarding).
        return React.createElement(PermissionHeader, {
            continueCallback: transitionToMainHeader,
        });
    }

    if (currentHeader === 'tutorial') {
        return React.createElement(TutorialHeader, {
            continueCallback: transitionToMainHeader,
        });
    }

    return React.createElement(MainHeader);
}

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('header-container');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(HeaderApp));
});
