const fs = require('fs');
const dateFormat = 'DD/MM/YYYY';
const config = require('./config');
const request = require('./request');
const vcbHistUrl = config.common.baseUrl + "/api/vcb";
const moment = require('moment');
let interv = null;
let queueData = [];
let isFirstRun = true;

function loadQueue() {
    let data = fs.readFileSync('persisQueue.txt', {encoding: 'utf8'});
    if (data) {
        queueData = JSON.parse(data)
    }
    console.log({loadQueue: queueData})
}

async function notify(notifyData) {
    //TODO: Send mail notify
    console.log({notifyData})
    try {
        await request.sendMail(config.common.notifyReceiverEmail, notifyData.message, notifyData.error);
    } catch (e) {
        console.log({e});
    }

}

async function callback(callbackBody) {
    //TODO: Callback to web register
    let rewrite = config.callback.rewriteBodyData(callbackBody);
    try {
        let {
            res,
            body
        } = await request.callRest(config.callback.url, rewrite, config.callback.query, config.callback.headers, 'POST', config.callback.timeout || 5000);
        if (res.statusCode === 200) {
            //Khi server khách trả trạng thái thành công thì xóa queue;
            queueData = [];
        }
        console.log({body})
    } catch ({err}) {
        console.error({err});
        console.log({rewrite});
    }
}

function wait(time) {
    let current = moment().valueOf();
    let end = current + time;
    while (current < end) {
        current = moment().valueOf();
    }
}

async function crawlHisByDate(date, breakPos) {
    console.log({date, breakPos})
    let ret = [];
    let d = JSON.parse(JSON.stringify(config.vcb));
    d.fromDate = date;
    d.toDate = date;
    while (true) {
        try {
            let {res, body} = await request.callRest(vcbHistUrl, d, {}, {authorization: config.common.token});
            config.vcb.cookie = body.cookie;

            switch (res.statusCode) {
                case 200:
                    let {code, des, transactions, nextIndex} = body.data;
                    switch (code) {
                        case '00':
                            for (let i = 0; i < transactions.length; i++) {
                                let trans = transactions[i];
                                if (trans.Reference === breakPos) {
                                    return {ok: true, data: ret, stop: true};
                                }
                                ret.push(trans);
                            }
                            if (nextIndex === '-1') {
                                return {ok: true, data: ret};
                            } else {
                                d.pageIndex = +nextIndex;
                            }

                            break;
                        default:
                            if (interv) {
                                clearInterval(interv);
                            }
                            return {
                                data: {
                                    error: des + " " + moment().valueOf(),
                                    message: 'Vui lòng lấy lại session và chạy lại script lấy lịch sử giao dịch VCB' + " " + moment().valueOf()
                                },
                                ok: false
                            }
                    }
                    break;
                case 403:
                case 401:
                case 404:
                    if (interv) {
                        clearInterval(interv);
                    }
                    return {
                        data: {
                            error: body.message + " " + moment().valueOf(),
                            message: 'Vui lòng kiểm tra lại thông tin kết nối hệ thống ongbantat.store ' + moment().valueOf()
                        },
                        ok: false
                    }
                case 400:
                    throw {err: body.message}
            }

        } catch (e) {
            let {err} = e;
            console.error(err);
            wait(30000);
        }

    }
}


let currentDate = moment();

async function crawling() {
    let ret = [];
    let breakPos = fs.readFileSync('position.txt', {encoding: 'utf8'});
    let today = moment();
    let fromDate = moment(config.vcb.fromDate, dateFormat);
    console.log({fromDate: fromDate.format(dateFormat)})
    let needStop = false;
    if (isFirstRun) {
        //todo: Crawl toàn bộ cho đến ngày fromdate
        isFirstRun = false;
        do {
            let {data, ok, stop} = await crawlHisByDate(today.format(dateFormat), breakPos);
            needStop = stop;
            if (!ok) {
                await notify(data);
                return {ok, data}
            }
            ret = ret.concat(data);
            today = today.subtract(1, 'days');
            wait(15000);
        } while (today.isSameOrAfter(fromDate) && !needStop);

    } else {
        //todo: crawl ngày hôm nay thôi
        let {data, ok, stop} = await crawlHisByDate(currentDate.format(dateFormat), breakPos);
        if (!ok) {
            await notify(data);
            return {ok, data}
        }
        ret = ret.concat(data);
        if (currentDate.format(dateFormat) !== moment().format(dateFormat)) {
            currentDate = moment();
        }

    }
    if (ret[0]) {
        fs.writeFileSync('position.txt', ret[0].Reference, {encoding: 'utf8'})
    }
    return {ok: true, data: ret}
}

async function crawlHis() {
    let {ok, data} = await crawling();
    if (ok) {
        queueData = queueData.concat(data);
        await callback(queueData);
        fs.writeFileSync('persisQueue.txt', JSON.stringify(queueData), {encoding: 'utf8'});
    } else {
        fs.writeFileSync('persisQueue.txt', JSON.stringify(queueData), {encoding: 'utf8'});
        throw data;
    }
}


async function run() {
    loadQueue();
    let contin = true;
    while (contin) {
        try {
            if (!isFirstRun) {
                wait(15000);
            }
            await crawlHis();
        } catch (e) {
            contin = false;
        }
    }
}

run().then().catch()

