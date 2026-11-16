package io.github.jaitak2121spec.dhun.ui.screens

/** Stable within a visit, varied between sessions; a first-name greeting appears occasionally. */
internal fun homeGreeting(name: String, variant: Int): String = when (variant.mod(3)) {
    0 -> "Hi, ${name.trim().split(Regex("\\s+")).firstOrNull().orEmpty().take(30)}"
    1 -> "Find your next favourite"
    else -> "Your soundtrack starts here"
}
