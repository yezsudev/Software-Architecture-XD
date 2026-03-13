package iuh.fit.cmsbe.core.service;

import iuh.fit.cmsbe.core.spi.CmsPlugin;
import iuh.fit.cmsbe.core.model.Article;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PluginManager {

    // Spring Boot tự động dò tìm mọi class implement CmsPlugin và đưa vào list này
    @Autowired(required = false)
    private List<CmsPlugin> plugins;

    public void executeBeforeSaveHooks(Article article) {
        if (plugins == null || plugins.isEmpty()) {
            System.out.println("Không có Plugin nào được gắn vào hệ thống.");
            return;
        }

        System.out.println("--- Bắt đầu chạy các Plugin ---");
        for (CmsPlugin plugin : plugins) {
            System.out.println("[Plugin Manager] Đang thực thi: " + plugin.getPluginName());
            plugin.beforeArticleSave(article);
        }
        System.out.println("--- Kết thúc chạy Plugin ---");
    }
}