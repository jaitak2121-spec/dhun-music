package io.github.jaitak2121spec.dhun.data.settings

/** Stable preference values; independent of the user's light/dark choice. */
enum class ColorTheme {
    MONO, INDIGO, FOREST;

    companion object {
        fun fromPreference(value: String?): ColorTheme =
            entries.firstOrNull { it.name == value } ?: MONO
    }
}
