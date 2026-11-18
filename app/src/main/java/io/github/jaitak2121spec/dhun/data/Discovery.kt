package io.github.jaitak2121spec.dhun.data

import io.github.jaitak2121spec.dhun.data.model.HomeShelf
import io.github.jaitak2121spec.dhun.data.model.Song
import io.github.jaitak2121spec.dhun.data.model.ShelfItem
import io.github.jaitak2121spec.dhun.data.model.durationMillis
import io.github.jaitak2121spec.dhun.playback.QueueBuilder
import java.util.Locale

/** Explicit musical preferences, independent of Google or Dhun account identity. */
data class DiscoveryTaste(val language: String = "", val artists: String = "", val genres: String = "") {
    val queries: List<String> get() {
        val names = artists.split(',').map { it.trim().take(50) }.filter { it.isNotEmpty() }
            .distinctBy { it.lowercase(Locale.ROOT) }.take(3)
        val context = listOf(language.trim().take(40), genres.trim().take(60)).filter { it.isNotBlank() }
        return (if (names.isEmpty()) listOf("") else names).mapNotNull { artist ->
            val parts = (listOf(artist) + context).filter { it.isNotBlank() }
            parts.takeIf { it.isNotEmpty() }?.joinToString(" ")?.take(150)?.plus(" songs")
        }.distinct()
    }
    val configured: Boolean get() = queries.isNotEmpty()
}

/** Two preference seeds, two learned seeds, and one broader discovery seed. */
fun personalDiscoveryQueries(taste: DiscoveryTaste, learnedArtists: List<String>): List<String> {
    val context = listOf(taste.language.trim().take(40), taste.genres.trim().take(60)).filter { it.isNotBlank() }.joinToString(" ")
    val learned = learnedArtists.map { it.trim().take(50) }.filter { it.isNotBlank() && !it.equals("Unknown", true) }
        .distinctBy { it.lowercase(Locale.ROOT) }.take(2).map { "$it $context songs".replace(Regex("\\s+"), " ").trim() }
    val broader = listOf(context, if (context.isBlank()) "popular songs official audio" else "new releases songs official audio").filter { it.isNotBlank() }.joinToString(" ")
    return (taste.queries.take(2) + learned + broader).distinctBy { it.lowercase(Locale.ROOT) }.take(5)
}

/** Keep source relevance, interleave seeds, and limit an artist's share of discovery. */
fun diverseDiscovery(batches: List<List<Song>>, excluded: Set<String> = emptySet(), limit: Int = 18): List<Song> {
    if (limit <= 0) return emptyList()
    val ids = excluded.toMutableSet()
    val artists = mutableMapOf<String, Int>()
    val result = mutableListOf<Song>()
    val longest = batches.maxOfOrNull { it.size } ?: 0
    for (index in 0 until longest) for (batch in batches) {
        val song = batch.getOrNull(index) ?: continue
        if (!song.videoId.matches(Regex("^[A-Za-z0-9_-]{11}$")) || song.localUri != null || song.localPath != null || song.durationMillis() >= 900_000L || COMPILATION.containsMatchIn(song.title)) continue
        val artist = QueueBuilder.artistSet(song.artist).minOrNull().orEmpty()
        if (song.videoId in ids || result.any { QueueBuilder.isSameRecommendation(it, song) } || artists.getOrDefault(artist, 0) >= 3) continue
        ids.add(song.videoId); artists[artist] = artists.getOrDefault(artist, 0) + 1
        result.add(song)
        if (result.size >= limit) return result
    }
    return result
}

/** Recents and explicit taste come first; identical cards do not fill several shelves. */
fun cleanHomeShelves(shelves: List<HomeShelf>): List<HomeShelf> {
    val cards = mutableSetOf<String>()
    return shelves.sortedBy { when (it.title) { "Recents" -> 0; "Picked for your taste" -> 1; else -> 2 } }
        .mapNotNull { shelf ->
            val items = shelf.items.filter { item ->
                val key = item.videoId?.let { "song:$it" } ?: item.browseId?.let { "collection:$it" }
                key == null || cards.add(key)
            }
            shelf.copy(items = items).takeIf { items.isNotEmpty() }
        }
}

private val COMPILATION = Regex("""\b(?:full album|non[ -]?stop|compilation|jukebox|playlist|megamix|\d+\s*(?:hour|hr)s?)\b""", RegexOption.IGNORE_CASE)

/** Radio neighbours lead; discovery gets its own space without repeating a song family. */
fun discoveryShelves(personal: List<List<Song>>, fresh: List<List<Song>>, excluded: Set<String> = emptySet(), seeds: List<Song> = emptyList()): List<HomeShelf> {
    val picked = diverseDiscovery(personal.map { batch -> batch.filter { song -> seeds.none { QueueBuilder.isSameRecommendation(it, song) } } }, excluded, 12)
    val discoveries = diverseDiscovery(fresh.map { batch -> batch.filter { song -> (seeds + picked).none { QueueBuilder.isSameRecommendation(it, song) } } }, excluded, 12)
    return listOf(
        Triple("Made for you", "From your listening and favourite artists", picked),
        Triple("Fresh discoveries", "A little further from your usual rotation", discoveries),
    ).mapNotNull { (title, subtitle, songs) -> songs.takeIf { it.isNotEmpty() }?.let {
        HomeShelf(title = title, subtitle = subtitle, items = it.map { song -> ShelfItem(song.title, song.artist, song.thumbnailUrl, song.videoId, null) })
    } }
}

/** Preserve selection order and never exceed a step's visible choice limit. */
internal fun toggleTasteSelection(selected: List<String>, choice: String, maximum: Int): List<String> = when {
    choice in selected -> selected.filterNot { it == choice }
    selected.size < maximum -> selected + choice
    else -> selected
}
