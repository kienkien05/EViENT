import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, service, stack }) => {
  return `${timestamp} [${service || 'app'}] ${level}: ${stack || message}`;
});

export function createLogger(serviceName: string): winston.Logger {
  return winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    defaultMeta: { service: serviceName },
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    transports: [
      new winston.transports.Console({
        format: combine(colorize(), logFormat),
      }),
    ],
  });
}
