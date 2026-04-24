package com.viewcounter.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PostViewReadService {

    private static final String SELECT_POST_VIEWS_SQL = "SELECT views FROM posts WHERE id = ?";

    private final JdbcTemplate jdbcTemplate;

    public long getDbViewCount(String postId) {
        try {
            Long value = jdbcTemplate.queryForObject(SELECT_POST_VIEWS_SQL, Long.class, postId);
            return value != null ? value : 0L;
        } catch (EmptyResultDataAccessException ex) {
            return 0L;
        }
    }
}
