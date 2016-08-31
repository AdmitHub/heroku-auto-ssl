"use strict";

// Import fs and path modules (Used to load test data)
var fs = require("fs");
var path = require("path");

// Import http (Used to test)
var http = require("http");

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
        // Check obj only has 1 key, if it has more than one than we are in trouble
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

    // Check to see that client sent "OK?"
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

/**
 * Data to be used in tests
 */
exports.testData = {};

/**
 * A sample GPG key to use in tests
 */
exports.testData.testKey = {};
exports.testData.testKey.public = "";
exports.testData.testKey.private = "";

/**
 * Sample text signed by various keys
 */
exports.testData.signedText = [];
exports.testData.signedText[0] = { clear: "", signed: "" };
exports.testData.signedText[1] = { clear: "", signed: "" };
exports.testData.signedText[2] = { clear: "", signed: "" };
exports.testData.signedText[3] = { clear: "", signed: "" };
exports.testData.signedText[4] = { clear: "", signed: "" };
exports.testData.signedText[5] = { clear: "", signed: "" };
exports.testData.signedText[6] = { clear: "", signed: "" };
exports.testData.signedText[7] = { clear: "", signed: "" };

/**
 * A functon specifically made for loading test data from files
 * @param path Path of data file, assuming working dir is `test-data`
 * @param assigner A function which assigns the value, expected signature: `function (content)`
 * @private
 */
exports.testData._loadFile = function(filename, assigner) {
    var content = fs.readFileSync(path.join(__dirname, "/../test-data/", filename), "UTF-8");
    assigner(content);
};

/**
 * Function which loads in the content of all test data
 * Test data is no automatically loaded in because data is stored in text files and is not needed for normal
 * library operation.
 *
 * This only has to be called once per instance of libchlngproto
 */
exports.testData.load = function() {
    // Array will be iterated through
    // First element of each item is file path to load
    // Second element of each item is the "assigner" for the _loadFile function
    var data = [
        [
            "test-key/public.asc",
            function(content) {
                exports.testData.testKey.public = content;
            }
        ],
        [
            "test-key/private.asc",
            function(content) {
                exports.testData.testKey.private = content;
            }
        ],
        [
            "signed-text/01.txt",
            function(content) {
                var i = exports.testData.signedText[0];
                i.clear = "OK?";
                i.signed = content;
            }
        ],
        [
            "signed-text/02.txt",
            function(content) {
                var i = exports.testData.signedText[1];
                i.clear = "url=/sslverify&content=supersecret";
                i.signed = content;
            }
        ],
        [
            "signed-text/03.txt",
            function(content) {
                var i = exports.testData.signedText[2];
                i.clear = "OK?";
                i.signed = content;
            }
        ],
        [
            "signed-text/04.txt",
            function(content) {
                var i = exports.testData.signedText[3];
                i.clear = "url=/sslverify&content=supersecret";
                i.signed = content;
            }
        ],
        [
            "signed-text/05.txt",
            function(content) {
                var i = exports.testData.signedText[4];
                i.clear = "OK!";
                i.signed = content;
            }
        ],
        [
            "signed-text/06.txt",
            function(content) {
                var i = exports.testData.signedText[5];
                i.clear = "url=doesnt_provide_content_key";
                i.signed = content;
            }
        ],
        [
            "signed-text/07.txt",
            function(content) {
                var i = exports.testData.signedText[6];
                i.clear = "content=doesnt_provide_url_key";
                i.signed = content;
            }
        ]
    ];

    data.forEach(function(item) {
        exports.testData._loadFile(item[0], item[1]);
    });
};

/**
 * An internal function used by exports._testEndpoint to print errors and call the callback
 * A seperate message because the request can complete in multiple places
 * @param endpoint Endpoint being tested
 * @param errors Short error names, passed to callback
 * @param errorMessages Long error messages, one entry per line
 * @param callback Callback for exports._testEndpoint
 * @private
 */
exports._testEndpoint_printErrors = function(endpoint, errors, errorMessages, callback) {
    if (errorMessages.length > 0) {
       console.log("Error testing endpoint: \"" + endpoint + "\"");
    }

    errorMessages.forEach(function(error) {
        console.log("    " + error);
    });

    callback(errors.length === 0, errors);
};

/**
 * Convenience method for testing Challenge Post protocol endpoints
 * @param serverInfo Object which contains information about the server, contains keys: host, port, path
 * @param requestMethod HTTP request method
 * @param requestEndpoint HTTP request endpoint (Will be appended to serverInfo.path)
 * @param requestBody HTTP request body
 * @param expectedCode Expected response HTTP status code
 * @param expectedBody Expected response body
 * @param callback Callback, signature: `function(ok, errors)`
 *          callback.ok = {boolean} If the endpoint meets expected requirements
 *          callback.errors = {array<string>} Array of errors, possible element values:
 *                  - internal = An internal error occcured while MAKING the http request
 *                  - body = Response body did not match
 *                  - code = Response code did not match
 * @private
 */
exports._testEndpoint = function(serverInfo, requestMethod, requestEndpoint, requestBody, expectedCode, expectedBody, callback) {
    // Prepare http request options
    var requestOptions = {
        method: requestMethod,
        hostname: serverInfo.host,
        port: serverInfo.port,
        path: serverInfo.path + requestEndpoint,
        headers: {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(requestBody)
        }
    };

    // Create errors array for later use
    // This will hold any validation errors
    var errors = [];
    var errorMessages = [];

    // Create request object
    var request = http.request(requestOptions, function(response) {
        // Set encoding
        response.setEncoding("utf8");

        // Register event handlers to collect response body
        var responseBody = "";
        response.on("data", function(chunk) {
            responseBody += chunk;
        });

        // Check response against expected parameters
        response.on("end", function(){
            // Check response HTTP status code
            if (response.statusCode !== expectedCode) {
                errors.push("code");
                errorMessages.push("Expected response status code to be: \"" + expectedCode + "\", was: \"" + response.statusCode + "\"");
            }

            // Check response body
            if (responseBody !== expectedBody) {
                errors.push("body");
                errorMessages.push("Expected response body to be:");
                errorMessages.push("    " + expectedBody);
                errorMessages.push("Was:");
                errorMessages.push("    " + responseBody);
            }

            exports._testEndpoint_printErrors(requestEndpoint, errors, errorMessages, callback);
        });
    });

    request.on("error", function(error) {
        errors.push("internal");
        errorMessages.push("An error occured when making the HTTP request:");
        errorMessages.push("    " + error.message);

        exports._testEndpoint_printErrors(requestEndpoint, errors, errorMessages, callback);
    });

    request.write(requestBody);
    request.end();
};

/**
 * Function which tests a url to determine if it is Challenge Post protocol compliant, makes testing various apps much
 * easier and quicker.
 * @param host Host of server to test (Do no include http)
 * @param port Port of server to test
 * @param path Path infront of Challenge Post protocol
 * @return True if server is compliant, false if not.
 *         If false is returned look in console for information on why test failed
 */
exports.test = function(host, port, path) {
    // Load test data
    exports.testData.load();

    // Info which holds all information about how to contact server
    // Passed to exports._testEndpoint method
    var serverInfo = {
        host: host,
        port: port,
        path: path
    };

    exports._testEndpoint(serverInfo, "POST", "/check", exports.testData.signedText[0].signed, 200, "OK", function(ok, errors) {
        console.log(ok, errors);
    });
};

module.exports = exports;
