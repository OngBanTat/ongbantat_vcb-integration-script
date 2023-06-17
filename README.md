# Script crawl lịch sử ngân hàng VCB cung cấp bởi https://ongbantat.store

## Hướng dẫn sử dụng.

### #1 Cài đặt nodejs phiên bản v16.20.0
### #2 Cài đặt pm2 bằng câu lệnh:
```
npm i -g pm2
```
### #3 Clone project về rồi cd vào thư mục chứa project gõ lệnh sau để cài thư viện
```
npm install
```
### #4 Mở file ```config.js``` để cấu hình thông tin kết nối dịch vụ
- Dòng 4: ```token``` --- Api token lấy trên trang dịch vụ ongbantat.store sau khi gia hạn dịch vụ VCB_HISTORY
- Dòng 5: ```notifyReceiverEmail``` --- Email của bạn để nhận thông báo khi có sự cố kết nối đến máy chủ VCB
- Dòng 6: ```googleVisionApiKey``` --- Bạn cần kích hoạt dịch vụ google vision để giải mã captcha (Cần thẻ add vào billing service của google--- free 1000 lần giải mã mỗi tháng nên yên tâm ko mất phí đâu) 
- Link dịch vụ google vision thì tìm hiểu với lấy api key ở đây: ```https://cloud.google.com/vision/```
- Đọc bài này để tự mình lấy được api key ở dòng 6: https://support.haravan.com/support/solutions/articles/42000087477-c%C3%A1ch-l%E1%BA%A5y-m%C3%A3-google-api-key
- Dòng 16: ```url``` --- Đường dẫn API web của bạn, nơi nhận thông báo biến động số dư để xử lý, chú ý để method POST và trả ```statusCode=200``` nếu tiếp nhận lịch sử thành công để script không gửi lặp dữ liệu
- Dòng 17: ```headers``` --- Cấu hình headers cần thiết để gọi được api của bạn
- Dòng 18: ```query``` --- Cấu hình queries cần thiết để gọi được api của bạn
- Dòng 19: ```timeout``` --- Số milisecons tối đa để gọi cho API của bạn
- Dòng 20: ```rewriteBodyData``` --- Bên trong hàm có param ```data``` và 1 ví dụ về ```data``` đây chính là dữ liệu crawl được sẽ gửi lên API của bạn. Bạn có thể tái cấu trúc lại dữ liệu gửi lên API trong hàm này
- Dòng 68: ```fromDate``` --- Thời điểm bạn crawl dữ liệu bắt đầu từ ngày nào chú ý định dạng DD/MM/YYYY. Mặc định sẽ là ```hôm nay``` 
- Dòng 74: ```username``` --- Tài khoản VCB của bạn
- Dòng 75: ```password``` --- Mật khẩu tài khoản VCB của bạn
- Dòng 76: ```browserId``` --- Lấy tại đường dẫn: https://chatgpt.ongbantat.store/ là chuỗi ký dự có dạng giống ```1d49d4ae6e67ed25ef48d9f2accd15ea```

### #5 chạy thử để kiểm tra cấu hình đã đúng chưa bằng cách gõ lệnh
```node index.js```

### #6 mọi thứ đã ok thì chạy dưới dạng services chạy ngầm trên vps bằng lệnh 
```pm2 start pm2.json```

# Ghi chú:
- ### Khách hàng cần dùng trình duyệt đang mở để lấy browserId ở dòng 76 vui lòng đăng nhập vào https://vcbdigibank.vietcombank.com.vn/ và lưu trình duyệt lần đầu tiên
- ### Khách hàng cần tự tìm hiểu thêm về pm2 để lần sau chạy lại dịch vụ. Lần sau cần chạy lại dịch vụ thì không cần phải làm các bước 1 2 3 4 5 nữa. nếu đổi pass ngân hàng thì vào sửa ```config.js``` thôi