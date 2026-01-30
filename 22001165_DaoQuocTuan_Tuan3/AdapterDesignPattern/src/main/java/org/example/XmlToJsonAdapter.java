package org.example;

class XmlToJsonAdapter implements IXmlSender {
    private JsonWebService jsonService;

    public XmlToJsonAdapter(JsonWebService jsonService) {
        this.jsonService = jsonService;
    }

    @Override
    public void sendXmlData(String xmlData) {
        System.out.println("Adapter nhận XML: " + xmlData);

        String jsonData = convertXmlToJson(xmlData);

        System.out.println("Adapter đã chuyển đổi sang JSON...");
        jsonService.submitJson(jsonData);
    }
    private String convertXmlToJson(String xml) {
        return xml.replace("<data>", "{ \"data\": \"")
                .replace("</data>", "\" }");
    }
}
