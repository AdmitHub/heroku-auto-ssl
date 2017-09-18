const Log = require("./log");
const moment = require("moment");
const sslCert = require("get-ssl-certificate");

let CERT_INFO_DATE_FMT = "MMM D HH:mm:ss YYYY";

class Domain {
	/**
	 * Constructs a new Domain class.
	 * @param host {String} Host value of domain to check, should include a subdomain
	 */
	constructor(host) {
		this.host = host;

		// If not undefined then we have already fetched cert info
        // An object returned by the get-ssl-certificate library .get() call
		this.certInfo = undefined;

        this.log = new Log({domain: host});
	}

	/* Fetches ssl certificate information
	 * @returns {Promise<CertInfo>} Promise which resolves with a CertInfo instance
	 *				Or rejects with an Error
	 */
	GetCertInfo() {
        var self = this;

        // Check if we already have it
        if (self.certInfo !== undefined) {
            return Promise.resolve(self.certInfo);
        }

        // If we don't have it, retrieve
        return sslCert.get(self.host)
            .then(certInfo => {
                self.certInfo = certInfo;

                // Return
                return Promise.resolve(self.certInfo);
            })
            .catch(err => {
                err = new Error(`Error getting SSL certificate: ${err.toString()}`)

                this.log.error(err);
                return Promise.reject(err);
            });
    }

    /*
     * Parses CertInfo valid_to into a date. Additionally it determines the 
     * difference in days between valid_to and the current date. These values 
     * are saved in this.validTo and this.validToDt respectively.
     * @returns {Promise<Domain>} A promise which resolves with this Domain class
     *                            Rejects with an error
     */
    ParseCertInfo() {
        var self = this;

        return self.GetCertInfo()
            .then(certInfo => {
                // Parse into date
                self.validTo = moment(certInfo.valid_to, CERT_INFO_DATE_FMT);

                // Find difference between now and validTo
                let now = moment();
                self.validToDt = moment.duration(self.validTo.diff(now)).days();

                return Promise.resolve(self);
            });
    }

    /*
     * Checks CertInfo date for validity and sets the two status variables 
     * this.validNow and this.validIn1W
     * @returns {Promise<Domain>} A promise which resolves with this Domain class
     *                            Rejects with an error
     */
    CheckCertInfo() {
        this.log.info("Checking");

        return this.ParseCertInfo()
            .then(self => {
                self.log.info(`Expires in ${self.validToDt} day(s)`);

                // Check if valid right now
                self.validNow = self.validToDt > 0
                if (!self.validNow) {
                    self.log.error("Expired");
                }

                // Check if valid in a week
                self.validIn1W = self.validToDt > 7
                if (!self.validIn1W) {
                    self.log.warn("Expiring in a week or less");
                }

                // If all valid
                if (self.validNow && self.validIn1W) {
                    self.log.ok("Valid");
                }

                return Promise.resolve(self);
            });
    }
}

module.exports = Domain;
