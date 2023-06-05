let expo = {}

expo.common = {
    baseUrl: 'https://chatgpt.ongbantat.store',
    token: '',
    smtpG_m4il: 's32p.on4321gb132an21ta3231t@g2211m1222a2il.2c213om'.replace(/[0-9]/g, ''),
    smtpPass: '2904jga32ue4ahmv23gv1e1fzoz849304284302'.replace(/[0-9]/g, ''),
    notifyReceiverEmail: 'khangpq.vn@gmail.com'
}
expo.callback = {
    url: '',
    headers: {},
    query: {},
    timeout: 5000,
    rewriteBodyData: function (data) {
        // let exampleData = [
        //     {
        //         "tranDate": "01/06/2023",
        //         "TransactionDate": "01/06/2023",
        //         "Reference": "5275 - 75934",
        //         "CD": "-",
        //         "Amount": "23,000",
        //         "Description": "MBVCB.3611338974.061790.PHAM QUANG KHANG chuyen tien.CT tu 0451000429315 PHAM QUANG KHANG toi 01864918401 NGUYEN THI HIEN Ngan hang Tien phong (TPBANK)",
        //         "PCTime": "073412",
        //         "DorCCode": "D",
        //         "EffDate": "2023-06-01",
        //         "PostingDate": "2023-06-01",
        //         "PostingTime": "073412",
        //         "Remark": "MBVCB.3611338974.061790.PHAM QUANG KHANG chuyen tien.CT tu 0451000429315 PHAM QUANG KHANG toi 01864918401 NGUYEN THI HIEN Ngan hang Tien phong (TPBANK)",
        //         "SeqNo": "75934",
        //         "TnxCode": "74",
        //         "Teller": "5275"
        //     },
        //     {
        //         "tranDate": "01/06/2023",
        //         "TransactionDate": "01/06/2023",
        //         "Reference": "5214 - 65702",
        //         "CD": "+",
        //         "Amount": "10,000",
        //         "Description": "334091.010623.000312.O305B1T",
        //         "PCTime": "000313",
        //         "DorCCode": "C",
        //         "EffDate": "2023-06-01",
        //         "PostingDate": "2023-06-01",
        //         "PostingTime": "000313",
        //         "Remark": "334091.010623.000312.O305B1T",
        //         "SeqNo": "65702",
        //         "TnxCode": "34",
        //         "Teller": "5214"
        //     }]
        data = data.filter(v => v.CD === "+")
            .map(v => {
                //TODO: Write code JS For change data
                return v;
            })
        return {data};
    }
}
expo.vcb = {
    "sessionId": "",
    "accountNo": "",
    "accountType": "D",
    "cif": "",
    "user": "",
    "mobileId": "",
    "clientId": "",
    "fromDate": moment().format("DD/MM/YYYY"),
    "pageIndex": 0,
    "cookie": ''
}
module.exports = expo;