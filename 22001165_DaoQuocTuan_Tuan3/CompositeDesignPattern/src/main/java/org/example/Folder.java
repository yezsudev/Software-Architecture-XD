package org.example;

import java.util.ArrayList;
import java.util.List;

public class Folder implements FileSystemComponent{
    private String name;
    private List<FileSystemComponent> children = new ArrayList<>();

    public Folder(String name) {
        this.name = name;
    }
    public void addComponent(FileSystemComponent component) {
        children.add(component);
    }
    public void removeComponent(FileSystemComponent component) {
        children.remove(component);
    }

    @Override
    public void showDetails() {
        System.out.println("Folder: " + name);
        for (FileSystemComponent component : children) {
            component.showDetails();
        }
    }
}
