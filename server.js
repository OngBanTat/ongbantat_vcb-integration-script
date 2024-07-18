const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const winston = require('winston');
const request = require('request');
require('winston-daily-rotate-file');
const app = express();
app.use(express.json());

const fileTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

const consoleTransport = new winston.transports.Console({
    format: winston.format.simple()
});

fileTransport.on('rotate', function (oldFilename, newFilename) {
    // do something fun
});

// Setup winston logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        fileTransport,
        consoleTransport
    ]
});


// Connect to SQLite database
let db = new sqlite3.Database('./db/queue.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        logger.error(err.message);
    }
    logger.info('Connected to the SQlite database.');
});


let isProcessingQueue = false;
setInterval(async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    console.log("vao day")

    isProcessingQueue = false;
}, 15000);

// Create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tranDate TEXT,
            TransactionDate TEXT,
            Reference TEXT,
            CD TEXT,
            Amount TEXT,
            Description TEXT,
            PCTime TEXT,
            DorCCode TEXT,
            EffDate TEXT,
            PostingDate TEXT,
            PostingTime TEXT,
            Remark TEXT,
            SeqNo TEXT,
            TnxCode TEXT,
            Teller TEXT);`);

app.post('/api/savequeue', (req, res) => {
    const data = req.body;

    let sql = `INSERT INTO transactions (
                    tranDate, TransactionDate, Reference, CD, Amount, Description, 
                    PCTime, DorCCode, EffDate, PostingDate, PostingTime, 
                    Remark, SeqNo, TnxCode, Teller) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    data.forEach(item => {
        db.run(sql, [
            item.tranDate, item.TransactionDate, item.Reference, item.CD,
            item.Amount, item.Description, item.PCTime, item.DorCCode,
            item.EffDate, item.PostingDate, item.PostingTime, item.Remark,
            item.SeqNo, item.TnxCode, item.Teller
        ], err => {
            if (err) {
                logger.error(err.message);
            }
        });
    });

    res.status(200).send('Data received and saved.');
});


// Server start
app.listen(process.env.PORT || 3000, () => logger.info('Server is running on port 3000...'));
