package com.example.coursemanagement.registration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, Long> {
    // JpaRepository đã có sẵn hàm findAll(), save(), findById(), delete()
}
