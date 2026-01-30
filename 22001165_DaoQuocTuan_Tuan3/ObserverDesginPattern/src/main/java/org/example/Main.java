package org.example;


public class Main {
    public static void main(String[] args) {
        // Tạo một công việc
        Task task1 = new Task("Thiết kế Database");

        // Tạo các thành viên
        TeamMember dev1 = new TeamMember("Alice (Dev)");
        TeamMember dev2 = new TeamMember("Bob (Tester)");
        TeamMember manager = new TeamMember("Charlie (PM)");

        // Các thành viên đăng ký theo dõi công việc này
        task1.attach(dev1);
        task1.attach(dev2);
        task1.attach(manager);

        // Thay đổi trạng thái -> Tất cả đều nhận được thông báo
        task1.setStatus("In Progress");

        // Bob nghỉ phép, hủy theo dõi
        task1.detach(dev2);

        // Thay đổi trạng thái lần nữa -> Chỉ Alice và Charlie nhận được
        task1.setStatus("Completed");
    }
}