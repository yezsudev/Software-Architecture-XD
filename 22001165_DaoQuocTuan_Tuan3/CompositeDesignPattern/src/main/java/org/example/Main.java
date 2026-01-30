package org.example;

public class Main {
    public static void main(String[] args) {
        FileSystemComponent file1 = new File("Data.txt");
        FileSystemComponent file2 = new File("Image.png");
        FileSystemComponent file3 = new File("Resume.pdf");

        Folder subFolder = new Folder("My Pictures");
        subFolder.addComponent(file2);

        Folder rootFolder = new Folder("Root");

        rootFolder.addComponent(file1);
        rootFolder.addComponent(subFolder);
        rootFolder.addComponent(file3);

        rootFolder.showDetails();
    }
}