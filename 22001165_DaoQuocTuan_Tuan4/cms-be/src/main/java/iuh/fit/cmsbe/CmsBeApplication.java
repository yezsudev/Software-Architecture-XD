package iuh.fit.cmsbe;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CmsBeApplication {

    public static void main(String[] args) {
        SpringApplication.run(CmsBeApplication.class, args);
        System.out.println("🚀 Hệ thống CMS (Layer + Microkernel) đã khởi động thành công!");
    }
}
