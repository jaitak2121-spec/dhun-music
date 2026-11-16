package io.github.jaitak2121spec.dhun.data

import org.junit.Assert.*
import org.junit.Test

class UsageAnalyticsTest {
    @Test fun onlyExplicitConsentAndANewUtcDayAllowASignal() {
        assertFalse(usageDue(false, -1, 0))
        assertTrue(usageDue(true, -1, 0))
        assertFalse(usageDue(true, 0, 86_399_999))
        assertTrue(usageDue(true, 0, 86_400_000))
        assertFalse(usageDue(false, 0, 86_400_000))
    }
}
