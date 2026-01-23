package com.example.coursemanagement.controller;

import com.example.coursemanagement.entity.Student;
import com.example.coursemanagement.service.StudentService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    // Lấy danh sách tất cả sinh viên
    @GetMapping
    public List<Student> getAll() {
        return studentService.getAllStudents();
    }

    // Tạo mới một sinh viên
    @PostMapping
    public Student create(@RequestBody Student student) {
        return studentService.createStudent(student);
    }
}
