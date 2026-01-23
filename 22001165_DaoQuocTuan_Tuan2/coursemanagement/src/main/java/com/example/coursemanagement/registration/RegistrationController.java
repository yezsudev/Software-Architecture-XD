package com.example.coursemanagement.registration;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    // Xem danh sách ai đã đăng ký khóa nào
    @GetMapping
    public List<Registration> getAll() {
        return registrationService.getAllRegistrations();
    }

    // Đăng ký khóa học mới
    @PostMapping
    public Registration register(@RequestBody Registration registration) {
        return registrationService.createRegistration(registration);
    }
}
