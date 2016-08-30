"use strict";

// Import query string parser
var qs = require("qs");

// Import and config openpgp module
var openpgp = require("openpgp");
openpgp.config.aead_protect = true;

var exports = {};

/**
 * Object which stores current challenge
 */
exports.currentChallenge = { url: "", content: "" };

/**
 * Common helpers
 */
exports.common = {};

/**
 * Verifies signed message
 * @param msg Message to verify, should be a string
 * @return {msgText, valid} Returns an array (Acting as a tuple)
 *                          First element is the message text
 *                          Second element is either a negative integer or a boolean, values:
 *                              -1    = No public key found
 *                              -2    = Error verifying message
 *                              true  = Message valid
 */
exports.common.verify = function (msg) {
    var pubKey = undefined;

    // Check if $CHLNG_POST_PROTO_PUB_KEY enviroment variable is found
    if (process.env.CHLNG_POST_PROTO_PUB_KEY !== undefined) {
        // If found, set local var
        pubKey = process.env.CHLNG_POST_PROTO_PUB_KEY;
    } else {
        // If not found return -1 error code
        return [undefined, -1];
    }

    // Verify message is signed by private key corresponding with public key provided
    try {
        // Create OpenPGPjs key object for key found above
        var keyObj = openpgp.key.readArmored(pubKey).keys;

        // Create OpenPGPjs message object
        var msgObj = openpgp.message.readArmored(msg);

        // Get message content before we do anything else
        var msgTxt = msgObj.getText().trim();

        // Call OpenPGPjs verify method
        var verif = msgObj.verify(keyObj);
        // Make obj is only has 1 key, if it has more than one than we are in trouble
        //      (since we only imported one)
        if (verif.length !== 1) {
            return [msgTxt, -2];
        }

        // For convenience sake set verif object to its only element
        verif = verif[0];
        // If valid is null than that means something is wrong with our public key
        if (verif.valid === null) {
            return [msgTxt, -2];
        }

        // If all is well then return status
        return [msgTxt, verif.valid];
    } catch(e) {
        // Log error and return -2 error code if something went wrong
        console.error("Error verifying message:", e);
        return [undefined, -2];
    }
};

/**
 * Verifies and sends the appropriate error as a response if needed
 * @param msg The message to verify
 * @param send The send method
 * @returns {number} Same return values as exports.common.verify
 */
exports.common.verifyAndSendErrors = function (msg, send) {
    var verif = exports.common.verify(msg);
    var resCode = verif[1];

    // Send appropriate message back for each error
    if (resCode === -1) {
        send(500, "NO PUB");
    } else if (resCode === -2) {
        send(500, "ERROR");
    } else if (resCode === false) {
        send(404, "NOT FOUND");
    }

    return verif;
};

/**
 * Protocol endpoint handlers
 */
exports.endpoints = {};

/**
 * Check endpoint
 * @param body Body of request as plain text
 * @param send Method which matches `function send (statusCode, textResponse)`
 */
exports.endpoints.check = function (body, send) {
    // Verify request
    var verif = exports.common.verifyAndSendErrors(body, send);
    var txt = verif[0];
    var resCode = verif[1];

    if (resCode !== true) {
        // Return without doing anything if result of verifyAndSendErrors is not true
        // Makes sense because verifyAndSendErrors will send correct responses to client for every value but true
        return;
    }

    // Check to see that client send "OK?"
    if (txt !== "OK?") {
        send(400, "BAD BODY");
        return;
    }

    // Send ok response if all is well
    send(200, "OK")
};

/**
 * Post endpoint
 * @param body Body of request as plain text
 * @param send Method which matches `function send (statusCode, textResponse)`
 */
exports.endpoints.post = function (body, send) {
    // Verify request
    var verif = exports.common.verifyAndSendErrors(body, send);
    var txt = verif[0];
    var resCode = verif[1];

    if (resCode !== true) {
        // Return with doing anything if result of verifyAndSendErrors is not true
        // See exports.endpoints.check for further explanation
        return;
    }

    // Get properties
    var props = qs.parse(txt);

    // Check to make sure url and content fields are provided
    if (props.url === undefined || props.content === undefined) {
        // If not provided than return error
        send(400, "BAD BODY");
        return;
    }

    // Set current challenge
    exports.currentChallenge = {
        url: props.url,
        content: props.content
    };

    // Respond ok
    send(200, "OK");
};

module.exports = exports;
