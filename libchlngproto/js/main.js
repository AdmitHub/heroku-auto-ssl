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
 * Helpers for clients using this library
 */
exports.clientHelpers = {};

/**
 * Useful function for making a send function when using ExpressJS
 * @param res Express response object
 * @returns {Function} send function compatible with endpoint functions.
 */
exports.clientHelpers.makeSendFuncExpress = function(res) {
    return function(code, body) {
        if (body !== undefined) {
            res.status(code).send(body);
            return;
        }

        res.sendStatus(code);
    };
};

/**
 * Methods and information relating to the public key used to verify incoming requests
 * @type {{}}
 */
exports.pubKey = {};

/**
 * Text of public key, set to `undefined` when there is no text
 */
exports.pubKey.data = undefined;

/**
 * Loads the public key via text passed into method
 * @param text Raw text of public key
 */
exports.pubKey.fromText = function(text) {
    // Check to make sure text isn't empty, because public keys cannot be empty...
    if (text === undefined || text.length === 0) {
        // Log warning
        console.error("libchlngproto - Cannot load public key from empty text string");
        return;
    }

    // If all good, set
    exports.pubKey.data = text;
};

/**
 * Loads public key from an environment variable
 * Called automatically when module loads
 * @param key [optional] Environment variable name, defaults to `CHLNG_POST_PROTO_PUB_KEY`
 */
exports.pubKey.fromEnv = function(key) {
    // Assign default value if key is undefined
    if (key === undefined) {
        key = "CHLNG_POST_PROTO_PUB_KEY";
    }

    // Check to make sure environment variable is provided
    if (process.env[key] === undefined) {
        // Log warning
        console.error("libchlngproto - Cannot load public key from empty environment variable")
        return;
    }

    exports.pubKey.data = process.env[key];
};

/**
 * Attempt to load public key first from an environment variable then via text
 * It is possible that all methods can fail
 * Useful if you use both load methods in different application environments (fromEnv for production, fromText for development)
 * @param key Environment variable key, pass `undefined` if you wish to use the default key
 * @param text Text to load
 */
exports.pubKey.tryLoadAll = function(key, text) {
    // Try to load from env
    var fromEnv = exports.pubKey.fromEnv(key);

    // Try to load from text if env failed
    var fromText = undefined;
    if (fromEnv === undefined) {
        fromText = exports.pubKey.fromText(text);
    }

    // Pick the first successful method, or set undefined
    if (fromEnv !== undefined) {
        exports.pubKey.data = fromEnv;
    } else if (fromText !== undefined) {
        exports.pubKey.data = fromText;
    } else {
        exports.pubKey.data = undefined;
    }
};

/**
 * Load the test public key from the test-data directory
 * @param callback Callback function, called when done loading test key
 */
exports.pubKey.loadTestKey = function(callback) {
    // Save current public key
    exports.pubKey.data_before_loadTestKey = exports.pubKey.data;

    // Load key
    exports.testData._loadFile("test-key/public.asc", function(content) {
        exports.pubKey.fromText(content);
        callback();
    });
};

/**
 * Set public key to what it was before pubKey.loadTestKey was called
 */
exports.pubKey.unloadTestKey = function() {
    exports.pubKey.data = exports.pubKey.data_before_loadTestKey;
};

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
    // Load public key
    var pubKey = exports.pubKey.data;

    // Check public key isn't empty
    if (pubKey === undefined) {
        return [undefined, -1];
    }

    // Verify message is signed by private key corresponding with public key provided
    try {
        // Create OpenPGPjs key object for key found above
        var keyObj = openpgp.key.readArmored(pubKey).keys;

        // Create OpenPGPjs message object
        try {
            var msgObj = openpgp.message.readArmored(msg);
        } catch (e) {
            console.error("Error loading message: ", msg);
            console.error("Error: ", e.message);
            return [undefined, -2];
        }

        // Get message content before we do anything else
        var msgTxt = msgObj.getText().trim();

        // Call OpenPGPjs verify method
        var verif = msgObj.verify(keyObj);
        // Check obj only has 1 key, if it has more than one than we are in trouble
        //      (since we only imported one)
        if (verif.length !== 1) {
            console.error("Error more than one public key loaded");
            return [msgTxt, -2];
        }

        // For convenience sake set verif object to its only element
        verif = verif[0];

        var valid = true;

        if (verif.valid === false || verif.valid === null) {
            valid = false;
        }

        // If all is well then return status
        return [msgTxt, valid];
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
        send(404, "Not Found");
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
     // Check body isn't empty
    if (body.length === 0) {
        send(400, "BAD BODY");
        return;
    }

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
    send(200, "OK");
};

/**
 * Post endpoint
 * @param body Body of request as plain text
 * @param send Method which matches `function send (statusCode, textResponse)`
 */
exports.endpoints.post = function (body, send) {
    // Check body isn't empty
    if (body.length === 0) {
        send(400, "BAD BODY");
        return;
    }

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
exports.testData.signedText[0] = { clear: "", signed: "", annotation: "" };
exports.testData.signedText[1] = { clear: "", signed: "", annotation: "" };
exports.testData.signedText[2] = { clear: "", signed: "", annotation: "" };
exports.testData.signedText[3] = { clear: "", signed: "", annotation: "" };
exports.testData.signedText[4] = { clear: "", signed: "", annotation: "" };
exports.testData.signedText[5] = { clear: "", signed: "", annotation: "" };
exports.testData.signedText[6] = { clear: "", signed: "", annotation: "" };
exports.testData.signedText[7] = { clear: "", signed: "", annotation: "" };

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
                i.annotation = "wrong keypair";
            }
        ],
        [
            "signed-text/04.txt",
            function(content) {
                var i = exports.testData.signedText[3];
                i.clear = "url=/sslverify&content=supersecret";
                i.signed = content;
                i.annotation = "wrong keypair";
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
exports._testEndpoint = function(serverInfo, requestMethod, requestEndpoint, requestSignTextIndex, expectedCode, expectedBody, callback) {
    var requestBody = exports.testData.signedText[requestSignTextIndex].signed;

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

    // Add request body
    request.write(requestBody);

    // "End" request, fires off request
    request.end();
};

/**
 * Function which tests a url to determine if it is Challenge Post protocol compliant, makes testing various apps much
 * easier and quicker.
 * @param host Host of server to test (Do no include http)
 * @param port Port of server to test
 * @param path Path infront of Challenge Post protocol
 * @param onFinish Callback for test process, function of signature: `function(passed, results)`
 * @return True if server is compliant, false if not.
 *         If false is returned look in console for information on why test failed
 */
exports.test = function(host, port, path, onFinish) {
    // Load test data
    exports.testData.load();

    // Info which holds all information about how to contact server
    // Passed to exports._testEndpoint method
    var serverInfo = {
        host: host,
        port: port,
        path: path
    };

    // Define matrix of tests
    var tests = [
        // method, endpoint, signed text index, expected code, expected body, [server info]
        ["POST", "/check", 0, 200, "OK"],
        ["POST", "/check", 4, 400, "BAD BODY"],
        ["POST", "/post", 1, 200, "OK"],
        ["GET", "/sslverify", 0, 200, "supersecret", {host: host, port: port, path: ""}],
        ["POST", "/post", 5, 400, "BAD BODY"],
        ["POST", "/post", 6, 400, "BAD BODY"],
        ["POST", "/post", 3, 404, "Not Found"]
    ];

    // Store results as they come in
    var testResults = [];

    // Recursive function that calls next test in `tests`
    var testI = -1;
    var callback = function(ok, errors) {
        // If this isn't the first loop (Because there is no test at index -1)
        if (testI !== -1) {
            // Store test results
            testResults[testI] = [ok, errors];

            // Print test results
            var test = tests[testI];
            var requestBody = exports.testData.signedText[test[2]];
	    if (errors.length !== 0) {
		    console.log("[" + testI + "] ^Test errors");
	    }
            console.log("[" + testI + "] " + test[0] + " " + test[1] + " [" + (test[2] + 1) + "] \"" + requestBody.clear + "\" (" + requestBody.annotation + ") => " + ok + ", " + errors);
        } else { // If first loop print header documenting test result output
            console.log("[?1] ?2 ?3 [?4] \"?5\" (?6) => ?7\n" +
                        "    ?1. Test index\n" +
                        "    ?2. Request HTTP method\n" +
                        "    ?3. Request URL (Without server path prepended)\n" +
                        "    ?4. Signed text id\n" +
                        "    ?5. Request body (Plain text of previously specified signed text)\n" +
                        "    ?6. Signed text annotation\n" +
                        "    ?7. Test passed?\n"
            );
        }

        // After storing previous test results, fire off next test
        testI += 1;

        if (testI < tests.length) { // If haven't reached end of array
            // Fire off test
            var test = tests[testI];
            exports._testEndpoint(test.length === 6 ? test[5] : serverInfo, test[0], test[1], test[2], test[3], test[4], callback);
        } else { // Tests are all done
            var allPassed = true;

            testResults.forEach(function(result) {
                if (result[0] === false) {
                    allPassed = false;
                }
            });

            // Call callback
            onFinish(allPassed, testResults);
        }
    };

    // Call while testI=-1 which marks first run
    callback();
};

exports.pubKey.fromEnv();
module.exports = exports;
