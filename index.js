const fs = require('fs');
const dateFormat = 'DD/MM/YYYY';
const config = require('./config');
const request = require('./request');
const vcbHistUrl = config.common.baseUrl + "/api/vcb";
const vcbLoginUrl = config.common.baseUrl + "/api/vcb/login";
const moment = require('moment');
let interv = null;
let queueData = [];
let isFirstRun = true;
const uuidv1 = require("uuid").v1;

function loadQueue() {
    let data = fs.readFileSync('persisQueue.txt', { encoding: 'utf8' });
    if (data) {
        queueData = JSON.parse(data)
    }
    console.log({ loadQueue: queueData })
}

async function notify(notifyData) {
    //TODO: Send mail notify
    console.log({ notifyData })
    try {
        await request.sendMail(config.common.notifyReceiverEmail, notifyData.message, notifyData.error);
    } catch (e) {
        console.log({ e });
    }

}

async function callback(callbackBody) {
    //TODO: Callback to web register
    let rewrite = config.callback.rewriteBodyData(callbackBody);
    if (rewrite.data.length === 0) {
        return
    }

    try {
        let {
            res,
            body
        } = await request.callRest(config.callback.url, rewrite, config.callback.query, config.callback.headers, 'POST', config.callback.timeout || 5000);
        if (res.statusCode === 200) {
            //Khi server khách trả trạng thái thành công thì xóa queue;
            queueData = [];
        }
        console.log({ body })
    } catch ({ err }) {
        console.error({ err });
        console.log({ rewrite });
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
    console.log({ date, breakPos })
    let ret = [];
    let d = JSON.parse(JSON.stringify(config.vcb));
    d.fromDate = date;
    d.toDate = date;
    while (true) {
        try {
            let { res, body } = await request.callRest(vcbHistUrl, d, {}, { authorization: config.common.token });
            config.vcb.cookie = body.cookie;

            switch (res.statusCode) {
                case 200:
                    let { code, des, transactions, nextIndex } = body.data;
                    switch (code) {
                        case '00':
                            for (let i = 0; i < transactions.length; i++) {
                                let trans = transactions[i];
                                if (trans.Reference === breakPos) {
                                    return { ok: true, data: ret, stop: true };
                                }
                                ret.push(trans);
                            }
                            if (nextIndex === '-1') {
                                return { ok: true, data: ret };
                            } else {
                                d.pageIndex = +nextIndex;
                            }

                            break;
                        case '108':
                        case '02':
                            await login();
                            wait(60000);
                            return await crawlHisByDate(date, breakPos);
                        default:
                            if (interv) {
                                clearInterval(interv);
                            }
                            return {
                                data: {
                                    code,
                                    error: des + " " + moment().valueOf(),
                                    message: 'Vui lòng cập nhật thông tin kết nối hệ thống VCB và chạy lại script lấy lịch sử giao dịch VCB' + " " + moment().valueOf()
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
                    throw { err: body.message }
            }

        } catch (e) {
            let { err } = e;
            console.error(err);
            wait(30000);
        }

    }
}


let currentDate = moment();

async function crawling() {
    let ret = [];
    let breakPos = fs.readFileSync('position.txt', { encoding: 'utf8' });
    let today = moment();
    let fromDate = moment(config.vcb.fromDate, dateFormat);
    console.log({ fromDate: fromDate.format(dateFormat) })
    let needStop = false;
    if (isFirstRun) {
        //todo: Crawl toàn bộ cho đến ngày fromdate
        isFirstRun = false;
        do {
            let { data, ok, stop } = await crawlHisByDate(today.format(dateFormat), breakPos);
            needStop = stop;
            if (!ok) {
                await notify(data);
                return { ok, data }
            }
            ret = ret.concat(data);
            today = today.subtract(1, 'days');
            wait(15000);
        } while (today.isSameOrAfter(fromDate) && !needStop);

    } else {
        //todo: crawl ngày hôm nay thôi
        let { data, ok } = await crawlHisByDate(currentDate.format(dateFormat), breakPos);
        if (!ok) {
            await notify(data);
            return { ok, data }
        }
        ret = ret.concat(data);
        if (currentDate.format(dateFormat) !== moment().format(dateFormat)) {
            currentDate = moment();
        }

    }
    if (ret[0]) {
        fs.writeFileSync('position.txt', ret[0].Reference, { encoding: 'utf8' })
    }
    return { ok: true, data: ret }
}

async function crawlHis() {
    let { ok, data } = await crawling();
    if (ok) {
        queueData = queueData.concat(data);
        await callback(queueData);
        fs.writeFileSync('persisQueue.txt', JSON.stringify(queueData), { encoding: 'utf8' });
    } else {
        fs.writeFileSync('persisQueue.txt', JSON.stringify(queueData), { encoding: 'utf8' });
        throw data;
    }
}


async function run() {
    loadQueue();
    let contin = true;
    await login();
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

async function login() {
    try {
        let captchaId = '';
        let captchaValue = "";
        do {
            captchaId = uuidv1();
            let captchaUrl = 'https://digiapp.vietcombank.com.vn/utility-service/v1/captcha/' + captchaId;
            captchaValue = await request.captchaSolver(captchaUrl);
            console.log({ captchaId, captchaValue })
            captchaValue = captchaValue.replace(/[^0-9]/g, '');
            console.log({ captchaId, captchaValue })
            console.log();
        } while (captchaValue.length !== 5)
        // captchaValue = "1234";
        let browserId = config.vcbLoginInfo.browserId;
        let user = config.vcbLoginInfo.username;
        let pass = config.vcbLoginInfo.password;
        let { res, body } = await request.callRest(vcbLoginUrl, {
            user,
            pass,
            captchaId,
            captchaValue,
            browserId
        }, {}, { authorization: config.common.token })
        config.vcb.cookie = body.cookie;

        switch (res.statusCode) {
            case 200:
                let { code, des } = body.data;
                switch (code) {
                    case '00':
                        let d = body.data;
                        console.log({ userInfo: d.userInfo })
                        config.vcb.browserId = browserId;
                        config.vcb.cookie = body.cookie;
                        config.vcb.sessionId = d.sessionId;
                        config.vcb.accountNo = d.userInfo.defaultAccount;
                        config.vcb.accountType = d.userInfo.defaultAccountType;
                        config.vcb.cif = d.userInfo.cif;
                        config.vcb.user = d.userInfo.username;
                        config.vcb.mobileId = d.userInfo.mobileId;
                        config.vcb.clientId = d.userInfo.clientId;
                        return {
                            data: {
                                error: des + " " + moment().valueOf(),
                                message: 'đăng nhập hệ thống VCB thành công' + " " + moment().valueOf()
                            },
                            ok: true
                        }
                    case "0111":
                        return login();
                    default:
                        return {
                            data: {
                                code: code,
                                error: des + " " + moment().valueOf(),
                                message: 'Vui lòng kiểm tra lại thông tin kết nối hệ thống ngân hàng VCB và chạy lại script lấy lịch sử giao dịch VCB' + " " + moment().valueOf()
                            },
                            ok: false
                        }
                }
            case 403:
            case 401:
            case 404:
                return {
                    data: {
                        error: body.message + " " + moment().valueOf(),
                        message: 'Vui lòng kiểm tra lại thông tin kết nối hệ thống ongbantat.store ' + moment().valueOf()
                    },
                    ok: false
                }
            case 400:
                throw { err: body.message }
        }
    } catch (e) {
        let { err } = e;
        console.error(err);
        wait(30000);
    }
}

// login().then(console.log).catch(console.error)

