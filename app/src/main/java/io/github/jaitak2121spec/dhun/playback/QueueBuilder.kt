package io.github.jaitak2121spec.dhun.playback

import io.github.jaitak2121spec.dhun.data.model.Song
import java.util.Locale

/**
 * Builds the station that plays on after a one-off song.
 *
 * Two problems this exists to solve:
 *
 *  - YouTube's watch queues routinely carry the same recording twice — the
 *    official audio and the music video are separate videoIds with near
 *    identical titles — so de-duping on id alone lets a track play, then play
 *    again as its video. Songs are matched on a normalised title plus lead
 *    artist instead.
 *
 *  - A radio mix leans hard on the seed's own artist. Capping how many tracks
 *    any one artist contributes keeps a station from turning into a single
 *    artist's discography.
 */
object QueueBuilder {

    /** No more than this many tracks by one artist in a single batch. */
    private const val PER_ARTIST_LIMIT = 2

    /** Automatic suggestions use song families; manual queues retain exact recordings. */
    fun extend(existing: List<Song>, candidates: List<Song>, limit: Int): List<Song> {
        if (limit <= 0) return emptyList()
        val taken = existing.toMutableList()
        val perArtist = mutableMapOf<String, Int>()
        val out = mutableListOf<Song>()
        val songsOnly = candidates.filterNot { it.isVideo }
        val remaining = songsOnly.ifEmpty { candidates }.toMutableList()
        var previous = existing.lastOrNull()?.artist?.let(::artistSet).orEmpty()
        while (out.size < limit && remaining.isNotEmpty()) {
            val eligible = remaining.filter { candidate ->
                taken.none { isSameRecommendation(it, candidate) } &&
                    (artistSet(candidate.artist).minOrNull()?.let { perArtist[it] } ?: 0) < PER_ARTIST_LIMIT
            }
            // Keep upstream relevance order, but avoid consecutive artists when possible.
            val candidate = eligible.firstOrNull { artistSet(it.artist).none { name -> name in previous } }
                ?: eligible.firstOrNull() ?: break
            remaining.remove(candidate)
            val artists = artistSet(candidate.artist)
            artists.minOrNull()?.let { perArtist[it] = (perArtist[it] ?: 0) + 1 }
            previous = artists
            taken += candidate
            out += candidate
        }
        return out
    }

    /** Covers, edits and remixes are valid manual choices, but repetitive autoplay. */
    internal fun isSameRecommendation(a: Song, b: Song): Boolean {
        if (isSameRecording(a, b)) return true
        val title = recommendationTitle(a.title)
        if (title.isEmpty() || title != recommendationTitle(b.title)) return false
        val left = artistSet(a.artist)
        val right = artistSet(b.artist)
        return left.isEmpty() || right.isEmpty() || left.any { it in right } ||
            VARIANT.containsMatchIn(a.title) || VARIANT.containsMatchIn(b.title)
    }

    internal fun recommendationTitle(raw: String): String = normalisedTitle(
        raw.replace(VARIANT_GROUP, " ").replace(VARIANT_SUFFIX, " ")
    )

    /**
     * Whether two entries are the same recording. Ids differ between the audio
     * and video cuts of a track, which is exactly the case id equality misses.
     */
    fun isSameRecording(a: Song, b: Song): Boolean {
        if (a.videoId == b.videoId) return true
        val title = normalisedTitle(a.title)
        if (title.isEmpty() || title != normalisedTitle(b.title)) return false
        // One shared name is enough. The two cuts of a track get billed in
        // whatever order the upload used — "Pritam, Arijit Singh & Shilpa Rao"
        // against "Shilpa Rao, Arijit Singh, & Pritam" is one song, twice.
        val left = artistSet(a.artist)
        val right = artistSet(b.artist)
        return left.isEmpty() || right.isEmpty() || left.any { it in right }
    }

    /**
     * `Kesariya (From "Brahmastra") | Official Video` and `Kesariya` are one
     * recording as far as a queue is concerned. Remix and cover markers are
     * deliberately left in — those really are different tracks.
     */
    internal fun normalisedTitle(raw: String): String = raw.lowercase(Locale.ROOT)
        .substringBefore(" | ")
        .replace(NOISE, " ")
        .replace(PUNCTUATION, " ")
        .replace(SPACES, " ")
        .trim()

    /** The cast behind a credit, split out so billing order stops mattering. */
    internal fun artistSet(raw: String): Set<String> = raw.lowercase(Locale.ROOT)
        .replace(TOPIC, " ")
        .split(",", "&", "·", "•", ";", " feat", " ft.", " ft ", " x ", " with ")
        .map { it.replace(PUNCTUATION, " ").replace(SPACES, " ").trim() }
        .filter { it.isNotEmpty() }
        .toSet()

    private const val VERSIONS = "remix|cover|slowed|sped[ -]?up|speed[ -]?up|reverb|lo[ -]?fi|nightcore|acoustic|live|instrumental|karaoke|remaster(?:ed)?"
    private val VARIANT = Regex("\\b(?:$VERSIONS)\\b", RegexOption.IGNORE_CASE)
    private val VARIANT_GROUP = Regex("""[\(\[][^)\]]*\b(?:$VERSIONS)\b[^)\]]*[\)\]]""", RegexOption.IGNORE_CASE)
    private val VARIANT_SUFFIX = Regex("""(?:\s+[-–—:]\s*|\s+(?=slowed\b|sped[ -]?up\b|speed[ -]?up\b|lo[ -]?fi\b))(?:$VERSIONS)\b.*$""", RegexOption.IGNORE_CASE)

    private val NOISE = Regex(
        """\((?:official|lyric|lyrics|lyrical|audio|video|visuali[sz]er|full song|hd|4k)[^)]*\)""" +
            """|\(from[^)]*\)""" +
            """|\[[^]]*]""" +
            """|\b(?:official (?:video|audio|music video)|lyrical video|full video|4k video)\b""",
        RegexOption.IGNORE_CASE,
    )
    private val TOPIC = Regex("""\s*-\s*topic\b""", RegexOption.IGNORE_CASE)
    private val PUNCTUATION = Regex("""[^\p{L}\p{N}]+""")
    private val SPACES = Regex("""\s+""")
}
