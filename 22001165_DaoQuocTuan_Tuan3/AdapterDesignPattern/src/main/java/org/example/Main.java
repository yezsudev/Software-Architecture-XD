package org.example;

public class Main {
    public static void main(String[] args) {
        String xmlData = "<data>Hello World</data>";

        JsonWebService realService = new JsonWebService();

        IXmlSender adapter = new XmlToJsonAdapter(realService);

        adapter.sendXmlData(xmlData);
    }
}