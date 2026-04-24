package com.viewcounter.worker;

public record BatchPersistResult(long receivedEvents, long appliedEvents, long affectedPosts) {
}
