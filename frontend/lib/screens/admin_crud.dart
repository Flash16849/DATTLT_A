import 'package:flutter/material.dart';
import 'package:frontend/models/test_question.dart';
import 'package:frontend/services/question_service.dart';
import '../services/auth_service.dart';
import './question_form.dart';
import './login.dart';
import './manage_accounts.dart';

class AdminCrudScreen extends StatefulWidget {
  const AdminCrudScreen({super.key});

  @override
  State<AdminCrudScreen> createState() => _AdminCrudScreenState();
}

class _AdminCrudScreenState extends State<AdminCrudScreen> {
  List<TestQuestion> questions = [];
  List<TestQuestion> tempList =
      []; //tempList được tạo ra để sử dụng cho hàm applyFilter và applySort bên dưới
  String selectedLevel = 'All';
  final List<String> levels = ['All', 'Easy', 'Medium', 'Hard', 'Images'];

  @override
  void initState() {
    super.initState();
    loadQuestions();
  }

  // Load các bài test đã làm ngay khi người dùng vào trang test records
  Future<void> loadQuestions() async {
    try {
      final results = await QuestionService().fetchAll();
      setState(() {
        questions = results; // records là List<Result>
        tempList = results;
      });
    } catch (e) {
      print("Lỗi khi load kết quả: $e");
    }
  }

  void applyFilter() {
    if (selectedLevel == 'All') {
      tempList = questions;
    } else if (selectedLevel == 'Images') {
      tempList = questions
          .where((r) => r.questionImg != Null && r.questionImg!.isNotEmpty)
          .toList();
    } else {
      tempList =
          questions
              .where(
                (r) =>
                    r.questionLevel.toLowerCase() ==
                    selectedLevel.toLowerCase(),
              )
              .toList();
    }
  }

  void showLogoutAlert(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Logout'),
          content: const Text('Are you sure you want to log out?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(), // Close dialog
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // Close dialog
                AuthService.logout();
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
              child: const Text('Logout'),
            ),
          ],
        );
      },
    );
  }

  void deleteQuesAlert(BuildContext context, String qId, int index) {
    bool isDeleted = false; // Flag to check if the question is deleted

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Question'),
          content: const Text('Are you sure you want to delete this question?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(), // Close dialog
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // Close dialog
                setState(() {
                  QuestionService().deleteQuestion(qId);
                  questions.removeAt(index);
                  isDeleted = true; // Set the flag to true
                });
              },
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (isDeleted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Question deleted successfully!'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Questions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => showLogoutAlert(context),
            tooltip: "Logout",
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                      icon: const Icon(Icons.manage_accounts),
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder:
                                (context) => ManageAccounts(),
                          ),
                        ); //QuestionFormWidget được gọi để ADD câu hỏi
                      },
                      tooltip: "Manage Accounts",
                  ),
                  SizedBox(width: 20,),
                  IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder:
                                (context) => QuestionFormWidget(question: null),
                          ),
                        ); //QuestionFormWidget được gọi để ADD câu hỏi
                      },
                      tooltip: "Add Question",
                  ),
                  SizedBox(width: 8,),
                  Container(
                    width: 95,
                    height: 30,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(30),
                    ),
                  
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton(
                        value: selectedLevel,
                        isDense: true,
                        isExpanded: true, // để nội dung không bị ép và overflow
                        onChanged: (value) {
                          setState(() {
                            selectedLevel = value!;
                            applyFilter();
                          });
                        },
                        items:
                            levels.map((level) {
                              return DropdownMenuItem(
                                value: level,
                                child: Text(level),
                              );
                            }).toList(),
                        style: const TextStyle(
                          color: Color(0xFF3F3D56),
                          fontSize: 12,
                        ),
                        underline: const SizedBox(), // bỏ gạch dưới mặc định
                        dropdownColor: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: tempList.length,
                itemBuilder: (context, index) {
                  final q = tempList[index];
                  return Card(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: ListTile(
                      title: Text(q.questionText),
                      subtitle: Text('Level: ${q.questionLevel}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit, color: Colors.orange),
                            onPressed: () {
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(
                                  builder:
                                      (context) =>
                                          QuestionFormWidget(question: q),
                                ), //QuestionFormWidget ở đây được gọi để SỬA câu hỏi
                              );
                            },
                            tooltip: "Edit Question",
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () {
                              deleteQuesAlert(context, q.questionId!, index);
                            },
                            tooltip: "Delete Question",
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
