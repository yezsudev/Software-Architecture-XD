package com.example.coursemanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Registration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student; // Liên kết tới Student

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;   // Liên kết tới Course

    private LocalDateTime registeredAt = LocalDateTime.now(); // Ngày đăng ký
}
