import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../models/test_question.dart';

class QuestionService {
  static String yourServerIp = '10.106.19.44'; // Thay thế bằng địa chỉ IP
  // final String baseUrl = 'http://$yourServerIp:5000/api';
  final String baseUrl = 'http://localhost:5000/api';

  Future<List<TestQuestion>> fetchQuestions(String level) async {
    final response = await http.get(
      Uri.parse('$baseUrl/question/random/$level'),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      final List<TestQuestion> questions =
          data.map((json) => TestQuestion.fromJson(json)).toList();
      return questions;
    } else {
      throw Exception('Failed to load questions');
    }
  }

  Future<TestQuestion> fetchWithID(String id) async {
    final response = await http.get(Uri.parse('$baseUrl/question/id/$id'));

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return TestQuestion.fromJson(data);
    } else {
      throw Exception('Failed to load question with ID $id');
    }
  }

  Future<List<TestQuestion>> fetchAll() async {
    final response = await http.get(Uri.parse('$baseUrl/question/all'));

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      final List<TestQuestion> questions =
          data.map((json) => TestQuestion.fromJson(json)).toList();
      return questions;
    } else {
      throw Exception('Failed to load questions');
    }
  }

// File hình để import qua Android dùng File image_picker còn web dùng Uint8List
Future<bool> addQuestion(TestQuestion question, {File? imageFile,Uint8List? webImageBytes,String? webImageName}) async {
    final uri = Uri.parse('$baseUrl/question/add');
    final request = http.MultipartRequest('POST', uri);

    // Thêm các trường không phải tệp vào request
    request.fields['questionId'] = question.questionId ?? '';
    request.fields['level'] = question.questionLevel;
    request.fields['questionText'] = question.questionText;
    request.fields['correctAnswer'] = question.correctAnswer;
    request.fields['maxTime'] = question.maxTime.toString();
    request.fields['options'] = json.encode(question.options); // đã đồng bộ với bên backend

    // Add image
    // Thêm hình cho Android, check dùm
    if (imageFile != null) {
      print("Uploading Android image: ${imageFile.path}");
      request.files.add(await http.MultipartFile.fromPath('image', imageFile.path)); // gửi tên hình lên server qua Android
    } 
    // Thêm hình cho Web, đã check
    else if (webImageBytes != null && webImageName != null) {
      print("Uploading Web image: $webImageName");
      request.files.add(http.MultipartFile.fromBytes('image',webImageBytes,filename: webImageName,)); // gửi tên hình lên server qua web
    }


    final streamedResponse = await request.send(); // Gửi request lên server
    final response = await http.Response.fromStream(streamedResponse); // Nhận response từ server

    return response.statusCode == 200 || response.statusCode == 201; // Kiểm tra mã trạng thái
  }


  Future<bool> editQuestion(TestQuestion question, {File? imageFile,Uint8List? webImageBytes,String? webImageName,}) async {
    final uri = Uri.parse('$baseUrl/question/update/${question.questionId}');
    var request = http.MultipartRequest('PUT', uri);

    // Thêm các trường không phải tệp vào request
    // question.toJson().forEach((key, value) {
    //   request.fields[key] = value.toString();
    // });

    question.toJson().forEach((key, value) {
      if (key == 'options') {
        // Convert list of Options to JSON string
        List<Map<String, dynamic>> optionsList =
            question.options.map((opt) => opt.toJson()).toList();
        request.fields[key] = jsonEncode(optionsList);
      } else {
        request.fields[key] = value.toString();
      }
    });

    // Thêm hình ảnh
    // Check xem có hình ảnh không, nếu có thì thêm vào request
    if (imageFile != null) {
      print("Uploading Android image: ${imageFile.path}");
      request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    } else if (webImageBytes != null && webImageName != null) {
      print("Uploading Web image: $webImageName");
      request.files.add(http.MultipartFile.fromBytes('image',webImageBytes,filename: webImageName,));
    }
    // print("Request fields: ${request.fields}");
    // print("Request files: ${request.files}");
    // Send the request
    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    // print('PUT Response: ${response.statusCode}');
    // print('Body: ${response.body}');

    return response.statusCode == 200 || response.statusCode == 201;
  }


  Future<void> deleteQuestion(String id) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/question/delete/$id'),
    );

    if (response.statusCode == 200) {
      print("✅ Deleted");
    } else {
      print("Haiz, bug again 😒");
    }

    // return response.statusCode == 200 || response.statusCode == 201;
  }
}
