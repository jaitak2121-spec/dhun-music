package io.github.jaitak2121spec.dhun.data

/** One exact-query action, then bounded unique local/remote completions. */
fun searchCompletions(input: String, recent: List<String>, remote: List<String> = emptyList()): List<String> {
    val query = input.trim().take(160)
    if (query.isEmpty()) return emptyList()
    return (listOf(query) + recent.filter { it.contains(query, ignoreCase = true) } + remote)
        .map { it.trim().take(160) }.filter { it.isNotEmpty() }
        .distinctBy { it.lowercase(java.util.Locale.ROOT) }.take(7)
}
