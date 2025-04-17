import winston from 'winston';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define base format
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.printf(info => {
    const metadata = info.metadata as Record<string, unknown>;
    const meta = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
    return `${info.timestamp} ${info.level}: ${info.message}${meta}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        baseFormat
      )
    }),
    // Application logs without colors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: baseFormat
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: baseFormat
    }),
    // Database logs without colors
    new winston.transports.File({
      filename: path.join(logDir, 'database.log'),
      format: baseFormat
    })
  ],
});

// Create logger wrapper with specific contexts
export const appLogger = {
  error(message: string, meta?: any) {
    logger.error(message, meta);
  },
  warn(message: string, meta?: any) {
    logger.warn(message, meta);
  },
  info(message: string, meta?: any) {
    logger.info(message, meta);
  },
  debug(message: string, meta?: Record<string, unknown>) {
    logger.debug(message, meta ? meta : {});
  }
};

export const dbLogger = {
  error(message: string, meta?: any) {
    logger.error(message, { ...meta, context: 'database' });
  },
  warn(message: string, meta?: any) {
    logger.warn(message, { ...meta, context: 'database' });
  },
  info(message: string, meta?: any) {
    logger.info(message, { ...meta, context: 'database' });
  },
  debug(message: string, meta?: Record<string, unknown>) {
    logger.debug(message, { ...meta, context: 'database' });
  }
};
