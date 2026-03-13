package iuh.fit.cmsbe.core.repository;

import iuh.fit.cmsbe.core.model.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
}
