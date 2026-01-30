package org.example;

public class TeamMember implements Observer{
    private String name;

    public TeamMember(String name) {
        this.name = name;
    }

    @Override
    public void update(String taskName, String newStatus) {
        System.out.println("Thông báo tới " + name + ": Công việc '" + taskName + "' hiện đang là '" + newStatus + "'.");
    }
}
