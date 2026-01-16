package com.example.daoquoctuan_22001165_jwt;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DemoController {

    @GetMapping("/public/ping")
    public Map<String, Object> ping() {
        return Map.of("ok", true, "message", "public endpoint");
    }

    @GetMapping("/api/hello")
    public Map<String, Object> hello() {
        return Map.of("ok", true, "message", "secured endpoint - JWT valid");
    }

    @GetMapping("/api/admin")
    public Map<String, Object> admin() {
        return Map.of("ok", true, "message", "admin endpoint - ROLE_ADMIN required");
    }
}
