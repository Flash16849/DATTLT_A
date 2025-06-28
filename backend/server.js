const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
// const { MongoClient } = require('mongodb');
const authRoutes = require('./routes/auth');
const registerRoutes = require('./routes/register');
const questionManagerRoutes = require('./routes/questionManager');
const userManagerRoutes = require('./routes/userManager');
const resultRoutes = require('./routes/resultManager'); // Import route quản lý kết quả bài kiểm tra

// const User = require('./models/User');
const cookieParser = require('cookie-parser');

const cors = require('cors');

const PORT = process.env.PORT || 5000; // Port cho server

const app = express();
const dbName = "User"; // Thay đổi tên cơ sở dữ liệu nếu cần

const accessPassword = "Raccoon-1"; // Mật khẩu truy cập MongoDB
const url = "mongodb+srv://adminM:"+accessPassword+"@usertest.1opu14d.mongodb.net/"+dbName+"?retryWrites=true&w=majority&appName=UserTest";


// const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true }); // Kết nối MongoDB
// const db = client.db(dbName); // Kết nối đến cơ sở dữ liệu
// const userCollection = db.collection("User"); // Tạo collection để lưu trữ người dùng
// const questionCollection = db.collection('Question'); // Tạo collection để lưu trữ câu hỏi

// Kết nối MongoDB bằng MongoClient
// client.connect()
//   .then(() => console.log('\n=========Kết nối MongoDB thành công========='))
//   .catch(err => console.error('Lỗi kết nối MongoDB:', err));
// Cấu hình middleware
app.use(cors({
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Kết nối MongoDB
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('\n=========Kết nối MongoDB thành công========='))
  .catch(err => console.log('Lỗi kết nối MongoDB', err));

// Sử dụng các route
app.use('/api/auth', authRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/question', questionManagerRoutes);
app.use('/api/user', userManagerRoutes); // Đường dẫn cho các route liên quan đến người dùng
app.use('/api/result', resultRoutes); // Đường dẫn cho các route liên quan đến kết quả bài kiểm tra
// Test API
app.get('/api/hello', (req, res) => {
  res.send('Hello World!');
});

// Tim hieu token trong cookie
const cookieName = 'jwt'; // Tên cookie

app.get('/api/getCookie', (req, res) => {
  const token = req.cookies.jwt; // Lấy token từ cookie
  if (!token) {
    return res.status(401).json({ message: 'Không có token trong cookie.' }); // Nếu không có token thì trả về lỗi 401
  }
  res.json({ token }); // Trả về token cho client
});
app.get('/api/setCookie', (req, res) => {
  res.cookie(cookieName, 'thong dip bi an', { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }); // Ghi cookie vào trình duyệt
  res.json({ ok: 1 }) // Trả về thông báo thành công
})

// Chạy server
app.listen(PORT, () => {
  console.log(`\nServer đang chạy trên cổng ${PORT}`);
});
