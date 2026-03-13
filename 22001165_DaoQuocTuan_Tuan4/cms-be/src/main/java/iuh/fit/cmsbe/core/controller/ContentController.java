package iuh.fit.cmsbe.core.controller;
import iuh.fit.cmsbe.core.model.Article;
import iuh.fit.cmsbe.core.service.ArticleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "*") // Mở CORS để Frontend (HTML/JS) có thể gọi được
public class ContentController {

    @Autowired
    private ArticleService articleService;

    // API lấy danh sách bài viết
    @GetMapping
    public ResponseEntity<List<Article>> getAll() {
        return ResponseEntity.ok(articleService.getAllArticles());
    }

    // API tạo bài viết mới
    @PostMapping
    public ResponseEntity<Article> create(@RequestBody Article article) {
        try {
            Article savedArticle = articleService.createArticle(article);
            return ResponseEntity.ok(savedArticle);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
