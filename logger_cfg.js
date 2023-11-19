"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var fs = require("fs");
var winston = require("winston");
var logLevels = ['error', 'info', 'debug'];
var logLevel = logLevels[Number(process.env.LOG_LEVEL) || 0];
var logFile = process.env.LOG_FILE;
/*if (!logLevel) {
    
    process.exit(1);
}*/
if (!logFile || !logFile.trim()) {
    process.exit(1);
}
else if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
}
exports.logger = winston.createLogger({
    level: logLevel,
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({ filename: logFile })
    ]
});
