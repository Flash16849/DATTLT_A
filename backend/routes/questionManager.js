const express = require('express'); // Import express để tạo router
const multer = require('multer'); // Middleware để xử lý file upload
const { v4: uuidv4 } = require('uuid'); // Thư viện tạo ID ngẫu nhiên
const router = express.Router();
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const Question = require('../models/Question'); // Import model Question
const bucket = require('../firebase/firebase'); // Import model Bucket
const { getStorage } = require('firebase-admin/storage');
const path = require('path');

const app = express();
const dbName = "User"; // Thay đổi tên cơ sở dữ liệu nếu cần
const collectionName = "Question"; // Tên collection trong MongoDB
const accessPassword = "Raccoon-1"; // Mật khẩu truy cập MongoDB
const url = "mongodb+srv://adminM:"+accessPassword+"@usertest.1opu14d.mongodb.net/User?retryWrites=true&w=majority&appName=UserTest";

const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true }); // Kết nối MongoDB
const db = client.db(dbName); // Kết nối đến cơ sở dữ liệu
const questionCollection = db.collection(collectionName); // Tạo collection để lưu trữ câu hỏi

const upload = multer({ storage: multer.memoryStorage() });

// Cấu hình middleware
app.use(cookieParser()); // Sử dụng cookie-parser để xử lý cookie
app.use(express.json()); // Sử dụng express.json() để xử lý JSON trong request body

// show tất cả câu hỏi trong MongoDB
router.get ('/all', async(req, res) => {
    const allData = await questionCollection.find().toArray();
    if (allData.length === 0) {
        return res.status(404).json({ message: 'Không có dữ liệu nào trong cơ sở dữ liệu.' });
    }
    res.json(allData);
    }
);

// Tìm kiếm câu hỏi theo id trong MongoDB (for demo)
router.get('/id/:id', async(req, res) => {
    const id = new ObjectId(req.params.id); // convert string → ObjectId
    const question = await questionCollection.findOne({ _id: id });
    if (!question) {
        return res.status(404).json({ message: 'Câu hỏi không tồn tại.' });
    }
    res.json(question);
});

// Tìm kiếm câu hỏi theo độ khó
router.get('/level/:level', async(req, res) => {
    const { level } = req.params;
    const question = await questionCollection.find({ level: level }).toArray();
    if (!question) {
        return res.status(404).json({ message: 'Câu hỏi không tồn tại.' });
    }
    res.json(question);
});

// Them câu hỏi mới vào MongoDB
router.post('/add', upload.single('image'), async (req, res) => {
    const { questionId, level, questionimg, questionText, options, correctAnswer, maxTime } = req.body;
    const file = req.file; // file upload từ client
    console.log('File upload:', file);

    try {
        // Các yêu cầu bắt buộc
        if (!level || !questionText || !options || !correctAnswer || !maxTime) {
            throw new Error("MISSINGDATA");
        }

        const parsedOptions = JSON.parse(options); // Parse options từ JSON string sang object
        // const parsedOptions = options
        
        // Kiểm tra định dạng options 
        if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4) {
            throw new Error("INVALIDOPTIONS");
        }

        // Kiểm tra định dạng từng lựa chọn
        for (let opt of parsedOptions) {
            if (!opt.label || !opt.text) {
                throw new Error("INVALIDOPTIONSFORMAT");
            }
        }

        // Kiểm tra định dạng đáp án đúng
        const validLabels = parsedOptions.map(opt => opt.label);
        if (!validLabels.includes(correctAnswer)) {
            throw new Error("INVALIDCORRECTANSWER");
        }

        // Tải ảnh lên Firebase Storage
        let questionImgUrl = null;
        if (file) {
            const fileName = `questions/${uuidv4()}_${file.originalname}`;  // Tạo tên file theo định dạng uuid + tên file gốc
            const blob = bucket.file(fileName);                             // Tạo blob từ bucket
            const blobStream = blob.createWriteStream({                     // Tạo stream để ghi file vào Firebase Storage       
                metadata: {
                    contentType: file.mimetype,
                },
            });

            // Ghi file vào Firebase Storage
            await new Promise((resolve, reject) => {
                blobStream.on('error', reject);     // Bắt lỗi nếu có
                blobStream.on('finish', resolve);   // Ghi file thành công
                blobStream.end(file.buffer);        // Kết thúc stream
            });

            // Lấy URL công khai của file
            await blob.makePublic();
            questionImgUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`; // Theo định dạng URL của Firebase Storage

            // const [url] = await blob.getSignedUrl({
            //     action: 'read',
            //     expires: '03-01-2500',
            // });
            // questionImgUrl = url;
        }

        // Tạo đối tượng câu hỏi mới
        const newQuestion = {
            questionId,
            level,
            questionImg: questionImgUrl,
            questionText,
            options: parsedOptions,
            correctAnswer,
            maxTime: parseInt(maxTime),
            createDate: new Date(),
            updatedDate: new Date()
        };

        // Thêm câu hỏi vào MongoDB
        await questionCollection.insertOne(newQuestion);
        console.log('Câu hỏi đã được thêm vào MongoDB:', newQuestion);
        res.status(201).json({ message: 'Câu hỏi đã được thêm thành công.' });

    } catch (error) {
        let msg = 'Lỗi server không rõ!';
        if (error.message === "MISSINGDATA") msg = 'Thiếu thông tin câu hỏi!';
        if (error.message === "INVALIDOPTIONS") msg = 'Danh sách đáp án phải có đúng 4 lựa chọn!';
        if (error.message === "INVALIDOPTIONSFORMAT") msg = 'Mỗi lựa chọn phải có label và text!';
        if (error.message === "INVALIDCORRECTANSWER") msg = 'Đáp án đúng không khớp với bất kỳ label nào trong các lựa chọn!';

        return res.status(400).json({ msg, error: error.message });
    }
});

// Cập nhật câu hỏi trong MongoDB
router.put('/update/:id', upload.single('image'), async (req, res) => {
    const id = new ObjectId(req.params.id); // convert string → ObjectId
    const { level, questionText, options, correctAnswer, maxTime } = req.body;
    const file = req.file; // file upload từ client

    try {
        // Các yêu cầu bắt buộc
        if (!level || !questionText || !options || !correctAnswer || !maxTime) {
            throw new Error("MISSINGDATA");
        }

        const maxTimeInt = parseInt(maxTime, 10);
        if (isNaN(maxTimeInt)) {
            throw new Error("INVALIDMAXTIME");
        }

        // Parse options từ JSON string sang object
        const parsedOptions = JSON.parse(options); // Parse options từ JSON string sang object
        // const parsedOptions = options;
        console.log('Parsed options:', parsedOptions);

        if (!Array.isArray(parsedOptions) || parsedOptions.length !== 4) {
            throw new Error("INVALIDOPTIONS");
        }

        for (let opt of parsedOptions) {
            if (!opt.label || !opt.text) {
                throw new Error("INVALIDOPTIONSFORMAT");
            }
        }

        const validLabels = parsedOptions.map(opt => opt.label);
        if (!validLabels.includes(correctAnswer)) {
            throw new Error("INVALIDCORRECTANSWER");
        }

        let questionImgUrl = null;

        // Step 1: Fetch existing question
        const existingQuestion = await questionCollection.findOne({ _id: id });

        // Step 2: If new image is provided and old image exists, delete old image from Firebase
        if (file && existingQuestion && existingQuestion.questionImg) {
            const storage = getStorage();
            const oldUrl = existingQuestion.questionImg;

            // Extract filename from the URL
            const filenameStart = oldUrl.indexOf('/questions/');
            if (filenameStart !== -1) {
                const filePath = oldUrl.substring(filenameStart + 1); // remove leading slash
                const oldFile = storage.bucket().file(filePath);
                await oldFile.delete().catch(err => {
                    console.warn('Could not delete old image:', err.message);
                });
            }
        }

        // Step 3: Upload new image if present
        if (file) {
            const fileName = `questions/${uuidv4()}_${file.originalname}`;
            const blob = bucket.file(fileName);
            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                },
            });

            await new Promise((resolve, reject) => {
                blobStream.on('error', reject);
                blobStream.on('finish', resolve);
                blobStream.end(file.buffer);
            });

            await blob.makePublic();
            questionImgUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        } else {
            // Keep the old image if no new image is uploaded
            questionImgUrl = existingQuestion?.questionImg || null;
        }

        const updatedQuestion = {
            level,
            questionImg: questionImgUrl,
            questionText,
            options: parsedOptions,
            correctAnswer,
            maxTime: maxTimeInt,
            updatedDate: new Date()
        };

        await questionCollection.updateOne({ _id: id }, { $set: updatedQuestion });

        res.status(200).json({ message: 'Câu hỏi đã được cập nhật thành công.' });

    } catch (error) {
        let msg = 'Lỗi server không rõ!';
        if (error.message === "MISSINGDATA") msg = 'Thiếu thông tin câu hỏi!';
        if (error.message === "INVALIDOPTIONS") msg = 'Danh sách đáp án phải có đúng 4 lựa chọn!';
        if (error.message === "INVALIDOPTIONSFORMAT") msg = 'Mỗi lựa chọn phải có label và text!';
        if (error.message === "INVALIDCORRECTANSWER") msg = 'Đáp án đúng không khớp với bất kỳ label nào trong các lựa chọn!';
        if (error.message === "INVALIDMAXTIME") msg = 'Thời gian tối đa không hợp lệ!';

        return res.status(400).json({ msg, error: error.message });
    }
});

// Xóa câu hỏi trong MongoDB
router.delete('/delete/:id', async (req, res) => {
    const id = new ObjectId(req.params.id); // convert string → ObjectId
    try {
        const result = await questionCollection.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Câu hỏi không tồn tại.' });
        }
        res.status(200).json({ message: 'Câu hỏi đã được xóa thành công.' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server không rõ!', error: error.message });
    }
});

// Lấy câu hỏi có hình
router.get('/random/imgonly', async (req, res) => {
    try {
        const questions = await questionCollection.aggregate([
            { $match: { questionImg: { $ne: null } } },
            { $sample: { size: 10 } }
        ]).toArray();

        if (questions.length === 0) {
            throw new Error("NOQUESTIONFOUND");
        }

        // Append full Firebase public URL if not already a full URL
        const bucketName = 'my-first-project-ecf2b.appspot.com'; // replace with your actual bucket name
        const updatedQuestions = questions.map(q => ({
            ...q,
            questionImg: q.questionImg.startsWith('http')
                ? q.questionImg
                : `https://storage.googleapis.com/${bucketName}/${q.questionImg}`
        }));

        res.json(updatedQuestions);

    } catch (error) {
        let msg = 'Lỗi server không rõ!';
        let status = 400;

        if (error.message === "NOQUESTIONFOUND") {
            msg = '!!!Không tìm thấy câu hỏi nào có hình ảnh!!!';
            status = 404;
        }

        return res.status(status).json({ msg, error: error.message });
    }
});



// Lấy random 5 câu hỏi cùng level
router.get('/random/:level', async (req, res) => {
    const { level } = req.params;
    try {
        const questions = await questionCollection.aggregate([
            { $match: { level: level } },
            { $sample: { size: 20 } } // Lấy ngẫu nhiên 5 câu hỏi
        ]).toArray();

        if (questions.length === 0) {
            throw new Error("NOQUESTIONFOUND");
        }
        res.json(questions);

    } catch (error) {
        let msg = 'Lỗi server không rõ!';
        let status = 400;

        if (error.message === "NOQUESTIONFOUND") msg = '!!!Không tìm thấy câu hỏi nào với độ khó này!!!'; status = 404;

        return res.status(status).json({ msg, error: error.message });
    }
});


module.exports = router;