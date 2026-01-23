package com.example.coursemanagement.repository;

import com.example.coursemanagement.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    // JpaRepository đã có sẵn hàm findAll(), save(), findById(), delete()
}