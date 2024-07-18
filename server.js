let CONFIG_CODE = process.env.CONFIG_CODE || {
    //TODO: Add config for regex extract code from bank transaction description
    "CTMB \\d+": {
        token: "",
        approveApi: ""
    }
}


async function callApiAprove(code, money, codeConfig) {
    //TODO: Implement code call api for approve bank transaction by code, money, and code config
    return {
        isOk: true,
        message: `Duyet nap tien thanh cong cho ma nap [${code}] so tien [${money.toLocaleString()}] tren api [${codeConfig.approveApi}]`
    } //isOk = true => Remove transaction and don't retry | false : retry later
}


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
    format: winston.format.combine(winston.format.timestamp(), winston.format.prettyPrint()),
    transports: [fileTransport, consoleTransport]
});


// Connect to SQLite database
let db = new sqlite3.Database('./queue.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        logger.error(err.message);
    }
    logger.info('Connected to the SQlite database.');
});


let isProcessingQueue = false;
setInterval(async () => {
    if (isProcessingQueue) return logger.info("Still processing queue...");
    isProcessingQueue = true;
    await processingQueue();
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
        db.run(sql, [item.tranDate, item.TransactionDate, item.Reference, item.CD, item.Amount, item.Description, item.PCTime, item.DorCCode, item.EffDate, item.PostingDate, item.PostingTime, item.Remark, item.SeqNo, item.TnxCode, item.Teller], err => {
            if (err) {
                logger.error(err.message);
            }
        });
    });

    res.status(200).send('Data received and saved.');
});

async function queryDb(sqlSelect) {
    return new Promise((resolve, reject) => {
        db.all(sqlSelect, [], (err, rows) => {
            if (err) {
                return reject(err);
            }
            return resolve(rows)
        });
    });
}

async function deleteTransById(id) {

    return new Promise((resolve, reject) => {
        db.run('DELETE FROM transactions WHERE id = ?', id, (err) => {
            if (err) {
                return reject(err);
            }
            return resolve(true)
        });
    });


}


async function processTransPlusMoney(transaction) {
    console.log({transaction})
    let {code, codeConfig} = extractCode(transaction.Remark);
    if (!code) return {isOk: true, message: "Khong co thong tin ma nap tien"}
    let money = +transaction.Amount.replace(/,/gi, "").replace(/\./gi, "");
    let {isOk, message} = await callApiAprove(code, money, codeConfig);
    return {isOk, message}
}

function extractCode(Remark) {
    for (let key in CONFIG_CODE) {
        let codeConfig = CONFIG_CODE[key];
        let regex = new RegExp(key);
        let match = Remark.match(regex)
        if (match) {
            return {code: match[0], codeConfig};
        }
    }
    return {code: null, codeConfig: null};
}

async function processingQueue() {
    try {
        let data = await queryDb("SELECT * FROM transactions");
        for (const t of data) {
            if (t.CD !== "+") {
                //Xóa những giao dich khong phai giao dich + tien
                let isDeleted = await deleteTransById(t.id);
                if (isDeleted) logger.info(`Bo qua giao dich khac giao dich cong tien: data=[${JSON.stringify(t)}]`);
                continue;
            }
            let {isOk, message} = await processTransPlusMoney(t);
            if (isOk) {
                await deleteTransById(t.id);
                logger.info(`Xử lý thành công giao dich: data=[${JSON.stringify(t)}] => message=[${message}]`);
            } else {
                logger.info(`Xử lý KHÔNG thành công giao dich: data=[${JSON.stringify(t)}] => message=[${message}]`);
            }
        }
    } catch (e) {
        logger.error(e.stack || e);
    }
}

let port = process.env.PORT || 9630
// Server start
app.listen(port, () => logger.info('Server is running on port ' + port));
