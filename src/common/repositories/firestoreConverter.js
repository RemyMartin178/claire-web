const encryptionService = require('../services/encryptionService');
const { Timestamp } = require('firebase/firestore');

/**
 * Creates a Firestore converter that automatically encrypts and decrypts specified fields.
 * @param {string[]} fieldsToEncrypt - An array of field names to encrypt.
 * @returns {import('@firebase/firestore').FirestoreDataConverter<T>} A Firestore converter.
 * @template T
 */
function createEncryptedConverter(fieldsToEncrypt = []) {
    return {
        /**
         * @param {import('@firebase/firestore').DocumentData} appObject
         */
        toFirestore: (appObject) => {
            const firestoreData = { ...appObject };
            // Ensure there's a timestamp for the last modification
            firestoreData.updated_at = Timestamp.now();
            return firestoreData;
        },
        /**
         * @param {import('@firebase/firestore').QueryDocumentSnapshot} snapshot
         * @param {import('@firebase/firestore').SnapshotOptions} options
         */
        fromFirestore: (snapshot, options) => {
            const firestoreData = snapshot.data(options);
            const appObject = { ...firestoreData, id: snapshot.id }; // include the document ID

            // Convert Firestore Timestamps back to Unix timestamps (seconds) for app-wide consistency
            for (const key in appObject) {
                if (appObject[key] instanceof Timestamp) {
                    appObject[key] = appObject[key].seconds;
                }
            }

            return appObject;
        }
    };
}

module.exports = {
    createEncryptedConverter,
}; 