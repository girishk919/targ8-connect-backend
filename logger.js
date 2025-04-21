const winston = require("winston");
require("winston-daily-rotate-file");

const dashLog = new winston.transports.DailyRotateFile({
	filename: "./logs/dash-%DATE%.log",
	datePattern: "YYYY-MM-DD",
	zippedArchive: true,
	maxSize: "20m",
});

const dash = winston.createLogger({
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		dashLog,
		new winston.transports.Console({
			colorize: true,
		}),
	],
});

module.exports = {
	dashLogger: dash,
};
