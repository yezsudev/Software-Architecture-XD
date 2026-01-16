package com.example.daoquoctuan_22001165_jwt;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;

import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.interfaces.RSAPublicKey;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.function.Function;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/public/**").permitAll()
                        .requestMatchers("/api/admin").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter()))
                )
                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() throws Exception {
        // đọc CERT từ classpath
        var resource = new ClassPathResource("public.pem");

        // Debug: nếu file không tồn tại hoặc rỗng sẽ lộ ngay
        if (!resource.exists()) {
            throw new IllegalStateException("public.pem NOT FOUND in classpath");
        }

        try (var in = resource.getInputStream()) {
            X509Certificate cert = (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(in);
            RSAPublicKey publicKey = (RSAPublicKey) cert.getPublicKey();
            return NimbusJwtDecoder.withPublicKey(publicKey).build();
        }
    }

    @Bean
    public Function<Jwt, ? extends AbstractAuthenticationToken> jwtAuthConverter() {
        return jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();

            Object rolesObj = jwt.getClaims().get("roles"); // ["USER","ADMIN"]
            if (rolesObj instanceof List<?> rolesList) {
                for (Object r : rolesList) {
                    if (r != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + r));
                }
            }

            return new JwtAuthenticationToken(jwt, authorities);
        };
    }
}
