import * as fs from 'fs';
import * as winston from 'winston';

const logLevels = ['error', 'info', 'debug'];
const logLevel = logLevels[Number(process.env.LOG_LEVEL) || 0];
const logFile = process.env.LOG_FILE;

/*if (!logLevel) {
    
    process.exit(1);
}*/

if (!logFile || !logFile.trim()) {
    process.exit(1);
} else if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
}
export const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({ filename: logFile })
    ]
});