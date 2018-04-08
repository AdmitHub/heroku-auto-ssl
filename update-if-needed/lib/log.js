class Log {
    /**
     * @param data {Object} Extra data to JSON serialize into log. Should not 
                            contain sub-objects as they will not be parsed 
                            nicely
     */
    constructor(data) {
        this.data = data;

        // Make a nicer looking version of presented JSON
        this.dataStr = "( ";
        var i = 0;
        for (var key of Object.keys(this.data)) {
            if (i > 0) {
                this.dataStr += ", ";
            }

            this.dataStr += key + ": " + this.data[key];
            i++;
        }

        this.dataStr += " )";
    }

    log(fn, tag, str) {
        fn(`[${tag}] ${this.dataStr} ${str}`);
    }

    ok(str) {
        this.log(console.log, "OK   ", str);
    }

    info(str) {
        this.log(console.log, "INFO ", str);
    }

    warn(str) {
        this.log(console.warn, "WARN ", str);
    }

    error(str) {
        this.log(console.error, "ERROR", str);
    }
}

module.exports = Log;
