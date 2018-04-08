const fs = require("fs");
const sslCert = require("get-ssl-certificate");
const moment = require("moment");
const DomainList = require("./lib/domainList");
const Log = require("./lib/log");

// Setup
let log = new Log({file: "index.js"});

// Get domains
var contents = fs.readFileSync("../domains.master.txt");
contents = String(contents);
contents = contents.replace(/(\r\n|\n|\r)/gm,"");

var domains = contents.split(" ");
domains.shift();// remove first item, which is root domain

// Check domains
let dl = new DomainList(domains);
dl.CheckAll()
    .then(() => {
        log.info(`Finished checking all domains`);
        log.info(`    expired     : ${dl.expiredDomains}`);
        log.info(`    valid       : ${dl.validDomains}`);
        log.info(`    should renew: ${dl.shouldRenewDomains}`);
        log.info(`    no action   : ${dl.noActionDomains}`);


        // If there are any renewal domains, write to domains.txt
        if (dl.shouldRenewDomains.length > 0) {
            domainsTxtStr = `admithub.com ${dl.shouldRenewDomains.join(" ")}`
            fs.writeFileSync("../domains.txt", domainsTxtStr);
            log.info("Wrote to domains.txt");
        }
    })
    .catch(err => {
        console.error(err);
    });
