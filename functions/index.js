/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * @name pickleGlassAuthCallback
 * @description
 * Validate Firebase ID token and return custom token.
 * On success, return success response with user information.
 * On failure, return error message.
 *
 * @param {object} request - HTTPS request object. Contains { token: "..." }.
 * @param {object} response - HTTPS response object.
 */
const authCallbackHandler = (request, response) => {
  cors(request, response, async () => {
    try {
      logger.info("pickleGlassAuthCallback function triggered", {
        body: request.body,
      });

      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }
      if (!request.body || !request.body.token) {
        logger.error("Token is missing from the request body");
        response.status(400).send({
          success: false,
          error: "ID token is required.",
        });
        return;
      }

      const idToken = request.body.token;

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      logger.info("Successfully verified token for UID:", uid);

      const customToken = await admin.auth().createCustomToken(uid);

      // If sessionId is provided, store the custom token for later retrieval
      const sessionId = request.body.session_id;
      if (sessionId) {
        logger.info("Storing custom token for session:", sessionId);
        await admin.firestore().collection("pending_sessions").doc(sessionId)
            .set({
              uid: uid,
              custom_token: customToken,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              expires_at: new Date(Date.now() + 120000),
              used: false,
            });
        logger.info("Custom token stored for session:", sessionId);
      }

      response.status(200).send({
        success: true,
        message: "Authentication successful.",
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name,
          picture: decodedToken.picture,
        },
        customToken,
      });
    } catch (error) {
      logger.error("Authentication failed:", error);
      response.status(401).send({
        success: false,
        error: "Invalid token or authentication failed.",
        details: error.message,
      });
    }
  });
};

exports.pickleGlassAuthCallback = onRequest(authCallbackHandler);

/**
 * @name pickleGlassAuthExchange
 * @description
 * Retrieve stored custom token for a session_id
 * @param {object} request - HTTPS request object
 * @param {object} response - HTTPS response object
 */
const authExchangeHandler = (request, response) => {
  cors(request, response, async () => {
    try {
      logger.info("pickleGlassAuthExchange function triggered", {
        body: request.body,
      });

      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      const {session_id} = request.body;
      if (!session_id) {
        response.status(400).send({
          success: false,
          error: "session_id is required.",
        });
        return;
      }

      // Get the stored session from Firestore
      const sessionDoc = await admin.firestore().collection("pending_sessions").doc(session_id).get();

      if (!sessionDoc.exists) {
        logger.error("Session not found:", session_id);
        response.status(404).send({
          success: false,
          error: "Session not found or expired.",
        });
        return;
      }

      const sessionData = sessionDoc.data();

      // Check if already used
      if (sessionData.used) {
        logger.error("Session already used:", session_id);
        response.status(409).send({
          success: false,
          error: "Session already used.",
        });
        return;
      }

      // Check if expired
      if (sessionData.expires_at.toDate() < new Date()) {
        logger.error("Session expired:", session_id);
        await admin.firestore().collection("pending_sessions").doc(session_id).delete();
        response.status(410).send({
          success: false,
          error: "Session expired.",
        });
        return;
      }

      // Mark as used
      await admin.firestore().collection("pending_sessions").doc(session_id).update({
        used: true,
        used_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("Successfully exchanged session:", session_id);

      response.status(200).send({
        success: true,
        custom_token: sessionData.custom_token,
      });
    } catch (error) {
      logger.error("Exchange failed:", error);
      response.status(500).send({
        success: false,
        error: "Internal server error.",
        details: error.message,
      });
    }
  });
};

exports.pickleGlassAuthExchange = onRequest(
    {region: "us-west1"},
    authExchangeHandler,
);
