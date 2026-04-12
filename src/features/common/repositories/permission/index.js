const Store = require('electron-store');
const store = new Store({ name: 'claire-permissions' });

/**
 * Permission Repository (Phase 1 Migration)
 * 
 * Migrated from SQLite to electron-store to support the removal of local SQLite
 * while keeping track of user-specific setup flags like keychain completion.
 */

function markKeychainCompleted(uid) {
    if (!uid) return;
    const key = `keychain_completed_${uid}`;
    store.set(key, true);
    console.log(`[PermissionRepo] Marked keychain as completed for user ${uid} in electron-store`);
}

function checkKeychainCompleted(uid) {
    if (!uid) return false;
    if (uid === 'default_user') return true;
    const key = `keychain_completed_${uid}`;
    const status = store.get(key) === true;
    console.log(`[PermissionRepo] Checked keychain status for user ${uid}: ${status}`);
    return status;
}

module.exports = {
    markKeychainCompleted,
    checkKeychainCompleted,
};