package com.example.coursemanagement.service;

import com.example.coursemanagement.entity.Student;
import com.example.coursemanagement.repository.StudentRepository;

import java.util.List;

public class StudentService {
    private final StudentRepository studentRepository;
    public StudentService(StudentRepository studentRepository){
        this.studentRepository = studentRepository;
    }

    public List<Student> getAllStudents(){
        return studentRepository.findAll();
    }

    public Student createStudent(Student student){
        return studentRepository.save(student);
    }
}
