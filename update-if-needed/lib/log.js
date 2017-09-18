class Log {
    /**
     * @param data {Object} Extra data to JSON serialize into log
     */
    constructor(data) {
        this.data = data;
        this.dataStr = JSON.stringify(data);
    }

    log(fn, tag, str) {
        fn(`[${tag}] ${this.dataStr} ${str}`);
    }

    ok(str) {
        this.log(console.log, "OK", str);
    }

    info(str) {
        this.log(console.log, "INFO", str);
    }

    warn(str) {
        this.log(console.warn, "WARN", str);
    }

    error(str) {
        this.log(console.error, "ERRO", str);
    }
}

module.exports = Log;
