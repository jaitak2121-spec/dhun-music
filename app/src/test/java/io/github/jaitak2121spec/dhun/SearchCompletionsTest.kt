package io.github.jaitak2121spec.dhun

import io.github.jaitak2121spec.dhun.data.searchCompletions
import org.junit.Assert.*
import org.junit.Test

class SearchCompletionsTest {
    @Test fun `exact query and recent matches work even when remote suggestions fail`() {
        assertEquals(listOf("da", "Daft Punk"), searchCompletions("da", listOf("Daft Punk", "Other")))
        assertEquals(listOf("da", "Daft Punk", "Dancing"), searchCompletions("da", listOf("Daft Punk"), listOf("daft punk", "Dancing", "")))
        assertTrue(searchCompletions(" ", listOf("Anything")).isEmpty())
    }
    @Test fun `queries and rows are bounded without losing non Latin text`() {
        assertEquals("धुन", searchCompletions("धुन", emptyList()).first())
        assertEquals(160, searchCompletions("x".repeat(300), emptyList()).first().length)
        assertEquals(7, searchCompletions("a", emptyList(), (1..30).map { "a$it" }).size)
    }
}
