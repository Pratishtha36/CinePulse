"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const formatLog = (level, message, meta) => {
    const payload = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...meta,
    };
    return JSON.stringify(payload);
};
exports.logger = {
    info: (message, meta) => {
        console.log(formatLog('info', message, meta));
    },
    warn: (message, meta) => {
        console.warn(formatLog('warn', message, meta));
    },
    error: (message, meta) => {
        console.error(formatLog('error', message, meta));
    },
    debug: (message, meta) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatLog('debug', message, meta));
        }
    },
};
