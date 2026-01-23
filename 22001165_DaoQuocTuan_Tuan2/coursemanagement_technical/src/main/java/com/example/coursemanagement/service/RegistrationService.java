package com.example.coursemanagement.service;

import com.example.coursemanagement.entity.Registration;
import com.example.coursemanagement.repository.RegistrationRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class RegistrationService {

    private final RegistrationRepository registrationRepository;

    public RegistrationService(RegistrationRepository registrationRepository) {
        this.registrationRepository = registrationRepository;
    }

    public List<Registration> getAllRegistrations() {
        return registrationRepository.findAll();
    }

    public Registration createRegistration(Registration registration) {
        return registrationRepository.save(registration);
    }
}
