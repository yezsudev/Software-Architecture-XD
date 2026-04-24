package com.viewcounter.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViewEvent implements Serializable {

    private String eventId;

    private String postId;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant timestamp;

    private String source;  // optional: track client type

    public static ViewEvent of(String postId) {
        return ViewEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .postId(postId)
                .timestamp(Instant.now())
                .source("api")
                .build();
    }
}
