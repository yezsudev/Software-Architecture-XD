package com.example.coursemanagement.course;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    // JpaRepository đã có sẵn hàm findAll(), save(), findById(), delete()
}
