package iuh.fit.cmsbe.core.spi;

import iuh.fit.cmsbe.core.model.Article;

public interface CmsPlugin {

    String getPluginName();

    void beforeArticleSave(Article article);
}
