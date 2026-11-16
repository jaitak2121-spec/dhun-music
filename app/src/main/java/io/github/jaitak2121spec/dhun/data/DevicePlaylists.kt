package io.github.jaitak2121spec.dhun.data

import android.content.Context
import android.content.SharedPreferences
import io.github.jaitak2121spec.dhun.data.model.Song
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class DevicePlaylist(val id: String, val title: String, val songs: List<Song>)

/** Sharing is explicit and contains public links only, never device file locations. */
fun playlistShareText(list: DevicePlaylist): String? {
    val online = list.songs.filter { it.localUri == null && Regex("^[A-Za-z0-9_-]{11}$").matches(it.videoId) }
    if (online.isEmpty()) return null
    return list.title + " · Dhun\n" + online.joinToString("\n") { "${it.title} — ${it.artist}\nhttps://music.youtube.com/watch?v=${it.videoId}" }
}

/** Device-only lists. No account, network request or automatic download. */
object DevicePlaylists {
    private lateinit var prefs: SharedPreferences
    private val state = MutableStateFlow<List<DevicePlaylist>>(emptyList())
    val playlists = state.asStateFlow()
    fun init(context: Context) {
        prefs = context.getSharedPreferences("dhun_device_playlists", Context.MODE_PRIVATE)
        state.value = runCatching {
            val rows = JSONArray(prefs.getString("lists", "[]"))
            (0 until rows.length()).map { i ->
                val row = rows.getJSONObject(i)
                val tracks = row.getJSONArray("songs")
                DevicePlaylist(row.getString("id"), row.getString("title"), (0 until tracks.length()).map { j ->
                    val t = tracks.getJSONObject(j)
                    Song(videoId = t.getString("id"), title = t.getString("title"), artist = t.getString("artist"),
                        thumbnailUrl = t.optString("art").takeIf { it.isNotBlank() },
                        localUri = t.optString("uri").takeIf { it.isNotBlank() },
                        localPath = t.optString("path").takeIf { it.isNotBlank() }, durationText = t.optString("duration").takeIf { it.isNotBlank() })
                })
            }
        }.getOrDefault(emptyList())
    }
    private fun save(lists: List<DevicePlaylist>) {
        val rows = JSONArray()
        lists.forEach { list ->
            val songs = JSONArray()
            list.songs.forEach { s -> songs.put(JSONObject().put("id", s.videoId).put("title", s.title).put("artist", s.artist)
                .put("art", s.thumbnailUrl.orEmpty()).put("uri", s.localUri.orEmpty()).put("path", s.localPath.orEmpty()).put("duration", s.durationText.orEmpty())) }
            rows.put(JSONObject().put("id", list.id).put("title", list.title).put("songs", songs))
        }
        check(prefs.edit().putString("lists", rows.toString()).commit()) { "Could not save your playlist. Device storage may be full." }
        state.value = lists
    }
    fun create(title: String, songs: List<Song> = emptyList()): String {
        require(title.trim().isNotEmpty() && title.length <= 80)
        val id = UUID.randomUUID().toString()
        save(state.value + DevicePlaylist(id, title.trim(), songs.distinctBy { it.videoId }))
        return id
    }
    fun add(id: String, songs: List<Song>) = save(state.value.map { if (it.id == id) it.copy(songs = (it.songs + songs).distinctBy { song -> song.videoId }) else it })
    fun rename(id: String, title: String) {
        require(title.trim().isNotEmpty() && title.length <= 80)
        save(state.value.map { if (it.id == id) it.copy(title = title.trim()) else it })
    }
    fun removeTrack(id: String, videoId: String) = save(state.value.map { if (it.id == id) it.copy(songs = it.songs.filterNot { song -> song.videoId == videoId }) else it })
    fun delete(id: String) = save(state.value.filterNot { it.id == id })
}
