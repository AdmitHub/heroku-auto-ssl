"use strict";

var exports = {};

/**
 * Methods which are application specific
 * @type {{}}
 */
exports.bootstrap = {};
exports.bootstrap.send = function(code, body) {};
exports.bootstrap.register = function(url, callback) {
    callback();
};

exports.endpoints = {};
exports.endpoints.check = function(body, send) {

};

exports.endpoints.post = function(body, send) {

};

module.exports = exports;