package io.github.jaitak2121spec.dhun.data.settings

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import io.github.jaitak2121spec.dhun.data.model.SearchHistoryEntity

/**
 * What's been searched for lately, kept on this device only.
 *
 * YouTube Music has an account-level search history, but reading it back needs
 * a separate signed-in call on every keystroke's worth of empty query — and it
 * would be wrong for a signed-out user. A local list is instant, works either
 * way, and is what Spotify and Apple Music show in the same spot.
 *
 * Stored as JSON rather than a delimited string: a query can contain any
 * character, separators included.
 */
object SearchHistory {

    /** Deep enough to be useful, shallow enough that the list stays scannable. */
    private const val MAX_ENTRIES = 20

    private lateinit var prefs: SharedPreferences
    private val json = Json
    private val serializer = ListSerializer(SearchHistoryEntity.serializer())

    private val _recent = MutableStateFlow<List<SearchHistoryEntity>>(emptyList())

    /** Most recent first. */
    val recent: StateFlow<List<SearchHistoryEntity>> = _recent.asStateFlow()
    private val _queries = MutableStateFlow<List<String>>(emptyList())
    val queries: StateFlow<List<String>> = _queries.asStateFlow()

    fun init(context: Context) {
        prefs = context.getSharedPreferences("dollbloom_settings", Context.MODE_PRIVATE)
        reload()
    }

    /**
     * Re-reads the list off disk.
     *
     * This shares its preference file with [AppSettings], so an import replaces
     * what is stored here without ever calling [record] — and the flow above
     * would otherwise go on serving the list the old device had.
     */
    fun reload() {
        if (!this::prefs.isInitialized) return
        _recent.value = runCatching {
            json.decodeFromString(serializer, prefs.getString(KEY_HISTORY, null) ?: "[]")
        }.getOrDefault(emptyList())
        _queries.value = runCatching {
            json.decodeFromString(ListSerializer(String.serializer()), prefs.getString("search_query_history", "[]") ?: "[]")
                .map { it.trim().take(160) }.filter { it.isNotEmpty() }.distinctBy { it.lowercase(java.util.Locale.ROOT) }.take(MAX_ENTRIES)
        }.getOrDefault(emptyList())
    }

    fun recordQuery(value: String) {
        val term = value.trim().take(160)
        if (term.isEmpty()) return
        _queries.value = (listOf(term) + _queries.value.filterNot { it.equals(term, true) }).take(MAX_ENTRIES)
        prefs.edit().putString("search_query_history", json.encodeToString(ListSerializer(String.serializer()), _queries.value)).apply()
    }

    /**
     * Records [entity], or moves it back to the top if it's already there.
     * Matching is by id so re-tapping an existing entity updates its timestamp.
     */
    fun record(entity: SearchHistoryEntity) {
        val deduped = _recent.value.filterNot { it.id.equals(entity.id, ignoreCase = true) }
        save((listOf(entity) + deduped).take(MAX_ENTRIES))
    }

    fun remove(id: String) {
        save(_recent.value.filterNot { it.id.equals(id, ignoreCase = true) })
    }

    fun clear() {
        save(emptyList())
        _queries.value = emptyList()
        prefs.edit().remove("search_query_history").apply()
    }

    private fun save(value: List<SearchHistoryEntity>) {
        _recent.value = value
        prefs.edit().putString(KEY_HISTORY, json.encodeToString(serializer, value)).apply()
    }

    private const val KEY_HISTORY = "search_history"
}
