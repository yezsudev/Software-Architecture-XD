package org.example;

import java.util.ArrayList;
import java.util.List;

public class Task implements Subject{
    private String taskName;
    private String status;
    private List<Observer> observers = new ArrayList<>();

    public Task(String taskName) {
        this.taskName = taskName;
        this.status = "New"; // Trạng thái ban đầu
    }

    // Khi trạng thái thay đổi, tự động thông báo cho mọi người
    public void setStatus(String newStatus) {
        this.status = newStatus;
        System.out.println("\n--- Task [" + taskName + "] đổi trạng thái sang: " + newStatus + " ---");
        notifyObservers();
    }

    @Override
    public void attach(Observer observer) {
        observers.add(observer);
    }

    @Override
    public void detach(Observer observer) {
        observers.remove(observer);
    }

    @Override
    public void notifyObservers() {
        for (Observer observer : observers) {
            observer.update(taskName, status);
        }
    }
}
