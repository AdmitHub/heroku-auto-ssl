"use strict";

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

    if (exports.common._pubKey !== undefined) {
        pubKey = exports.common._pubKey;
    } else if (process.env.CHLNG_POST_PROTO_PUB_KEY !== undefined) {
        exports.common._pubKey = pubKey;
        pubKey = process.env.CHLNG_POST_PROTO_PUB_KEY;
    } else {
        return -1;
    }

    try {
        return verify.verify(pubKey, msg);
    } catch(e) {
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

    return true;
};

/**
 * Decodes a application/x-www-form-urlencoded string
 * Taken from SO: http://stackoverflow.com/a/4458580/1478191
 * @param str String to decode
 */
exports.common.urlDecode = function (str) {
    decodeURIComponent((str+'').replace(/\+/g, '%20'));
};

/**
 * Protocol endpoint handlers
 */
exports.endpoints = {};
exports.endpoints.check = function (body, send) {
    var verif = exports.common.verifyAndSendErrors(body, send);
    if (verif !== true) {
        return;
    }

    if (body !== "OK?") {
        send(400, "BAD BODY");
        return;
    }

    send(200, "OK")
};

exports.endpoints.post = function (body, send) {
    var verif = exports.common.verifyAndSendErrors(body, send);
    if (verif !== true) {
        return;
    }

    var props = exports.common.urlDecode(body);
    if (props.url === undefined || props.content === undefined) {
        send(400, "BAD BODY");
        return;
    }

    exports.currentChallenge = {
        url: props.url,
        content: props.content
    };

    send(200, "OK");
};

module.exports = exports;

// EXAMPLE USAGE
/*
const libchlngproto = require("heroku-auto-ssl/libchlngproto");

app.get("*", function (req, res) {
    if (req.url === libchlngproto.currentChallenge.url) {
        res.send(200, libchlngproto.currentChallenge.content);
    }
});

app.post("/check", function (req, res) {
    libchlngproto.endpoints.check(req.body, res.send);
});

app.post("/post", function (req, res) {
    libchlngproto.endpoints.post(req.body, res.send);
});
*/