"use strict";

// Import crypto lib and create verify object
const crypto = require('crypto');
const verify = crypto.createVerify('RSA-SHA256');

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
 * @return -1 No public key found
 * @return -2 Error verifying
 * @return true msg is valid
 * @return false msg is not valid
 */
exports.common.verify = function (msg) {
    var pubKey = undefined;

    // Check if $CHLNG_POST_PROTO_PUB_KEY enviroment variable is found
    if (process.env.CHLNG_POST_PROTO_PUB_KEY !== undefined) {
        // If found, set local var
        pubKey = process.env.CHLNG_POST_PROTO_PUB_KEY;
    } else {
        // If not found return -1 error code
        return -1;
    }

    // Verify message is signed by private key corresponding with public key provided
    try {
        // Return verify status if all is well
        return verify.verify(pubKey, msg);
    } catch(e) {
        // Log error and return -2 error code if something went wrong
        console.error("Error verifying message:", e);
        return -2;
    }
};

/**
 * Verifies and sends the appropriate error as a response if needed
 * @param msg The message to verify
 * @param send The send method
 * @returns {number} Same return values as exports.common.verify
 */
exports.common.verifyAndSendErrors = function (msg, send) {
    var verif = exports.common.verify(msg, msg);

    // Send appropriate message back for each error
    if (verif === -1) {
        send(500, "NO PUB");
        return -1;
    } else if (verif === -2) {
        send(500, "ERROR");
        return -2;
    } else if (verif === false) {
        send(404, "NOT FOUND");
        return false;
    }

    // Assume true if program has reached this state
    return true;
};

/**
 * Decodes a application/x-www-form-urlencoded string
 * Taken from SO: http://stackoverflow.com/a/4458580/1478191
 * @param str String to decode
 */
exports.common.urlDecode = function (str) {
    // Handles some libraries encoding spaces as "+"
    decodeURIComponent((str+'').replace(/\+/g, '%20'));
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
    if (verif !== true) {
        // Return without doing anything if result of verifyAndSendErrors is not true
        // Makes sense because verifyAndSendErrors will send correct responses to client for every value but true
        return;
    }

    // Check to see that client send "OK?"
    if (body !== "OK?") {
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
    if (verif !== true) {
        // Return with doing anything if result of verifyAndSendErrors is not true
        // See exports.endpoints.check for further explanation
        return;
    }

    // Get properties
    var props = exports.common.urlDecode(body);

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

// EXAMPLE USAGE
/*
// Import libchlngproto from local fs, most likely libchlngproto will be a git submodule
const libchlngproto = require("heroku-auto-ssl/libchlngproto");

// Register check endpoint in place of your choosing
app.post("/chlngproto/check", function (req, res) {
    // Call handler function
    libchlngproto.endpoints.check(req.body, res.send);
});

// Register post endpoint in place of your choosing
app.post("/chlngproto/post", function (req, res) {
    // Call handler function
    libchlngproto.endpoints.post(req.body, res.send);
});

// Register handler in application to catch every request
app.get("*", function (req, res) {
    // Check to see if request url matches challenge url
    if (req.url === libchlngproto.currentChallenge.url) {
        // Send challenge content
        res.send(200, libchlngproto.currentChallenge.content);
    }
});
*/