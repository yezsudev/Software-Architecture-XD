package iuh.fit.cmsbe.core.service;

import iuh.fit.cmsbe.core.model.Article;
import iuh.fit.cmsbe.core.repository.ArticleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ArticleService {

    @Autowired
    private ArticleRepository articleRepository;

    @Autowired
    private PluginManager pluginManager;

    public List<Article> getAllArticles() {
        return articleRepository.findAll();
    }

    public Article createArticle(Article article) {
        // Validation cơ bản (Layer logic)
        if (article.getTitle() == null || article.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Tiêu đề không được để trống!");
        }

        // Kích hoạt kiến trúc Microkernel: Chạy qua các lá chắn Plugin trước khi lưu
        pluginManager.executeBeforeSaveHooks(article);

        // Lưu xuống Database (Layer Data Access)
        return articleRepository.save(article);
    }
}
