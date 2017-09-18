const Domain = require("./domain");

class DomainList {
    /* Creates a new DomainList instance full of Domain classes for each of the 
     * provided domains
     * @params domains {[String]} Array of host names to check
     */
    constructor(domains) {
        this.domainHosts = domains;

        // Make a domain for each
        this.domains = {};
        for (var i = 0; i < this.domainHosts.length; i++) {
            let domain = this.domainHosts[i];

            this.domains[domain] = new Domain(domain);
        }
    }

    /*
     * Checks all domains, saves results to this.expiredDomains, this.validDomains, 
     * this.shouldRenewDomains, and this.noActionDomains.
     *
     * - expiredDomains: An array of all the domain names that no longer have 
     *                   SSL certs
     * - validDomains: An array of all the domain names with valid SSL certs
     * - shouldRenewDomains: An array of all the domains that are expired or 
     *                       will expire in the next 7 days.
     * - noActionDomains: An array of domains which no action should be taken on
     * @returns {Promise<DomainList> Completed when all checked, rejects with error
     */
    CheckAll() {
        // info promises
        var iPs = [];

        // For each domain
        for (var i = 0; i < this.domainHosts.length; i++) {
            let key = this.domainHosts[i];
            let domain = this.domains[key];

            iPs.push(domain.CheckCertInfo());
        }

        // Wait until all parsed
        var self = this;
        self.expiredDomains = [];
        self.validDomains = [];
        self.shouldRenewDomains = [];
        self.noActionDomains = [];

        return Promise.all(iPs)
            .then((domains) => {
                // Check all domains
                for (let domain of domains) {
                    // Check if expired
                    if (!domain.validNow) {
                        self.expiredDomains.push(domain.host);
                    } else {
                        self.validDomains.push(domain.host);
                    }

                    // Check if should renew
                    if (!domain.validIn1W) {
                        this.shouldRenewDomains.push(domain.host);
                    } else {
                        self.noActionDomains.push(domain.host);
                    }
                }

                return Promise.resolve(self);
            });
    }
}

module.exports = DomainList;
