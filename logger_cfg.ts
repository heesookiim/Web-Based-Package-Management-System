import * as fs from 'fs';
import { createLogger, transports } from 'winston';
import { format } from 'logform';

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
export const logger = createLogger({
    level: logLevel,
    format: format.combine(
        format((info) => {
            info.timestamp = new Date().toISOString();
            return info;
        })(),
        format.printf(({ level, message, timestamp }) => {
            return `[${timestamp}] ${level}: ${message}`;
        }),
    ),
    transports: [
        new transports.File({ filename: logFile })
    ]
});