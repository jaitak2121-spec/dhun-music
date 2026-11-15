package io.github.jaitak2121spec.dhun.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import io.github.jaitak2121spec.dhun.data.settings.ColorTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DhunThemeTest {
    @Test
    fun missingOrUnknownPreferencesUseMono() {
        assertEquals(ColorTheme.MONO, ColorTheme.fromPreference(null))
        assertEquals(ColorTheme.MONO, ColorTheme.fromPreference("removed_theme"))
        ColorTheme.entries.forEach { assertEquals(it, ColorTheme.fromPreference(it.name)) }
    }

    @Test
    fun normalTextHasAccessibleContrastInEveryPaletteAndMode() {
        for (theme in ColorTheme.entries) for (dark in listOf(false, true)) {
            val scheme = dhunColorScheme(theme, dark)
            for ((text, background) in listOf(
                scheme.onBackground to scheme.background,
                scheme.onSurface to scheme.surface,
                scheme.onSurfaceVariant to scheme.surfaceVariant,
                scheme.onPrimary to scheme.primary,
                scheme.onPrimaryContainer to scheme.primaryContainer,
            )) {
                val a = text.luminance()
                val b = background.luminance()
                val contrast = (maxOf(a, b) + 0.05f) / (minOf(a, b) + 0.05f)
                assertTrue("$theme dark=$dark contrast=$contrast", contrast >= 4.5f)
            }
        }
    }

    @Test
    fun monoUsesBlackAndWhiteInBothModes() {
        assertEquals(Color.Black, dhunColorScheme(ColorTheme.MONO, true).background)
        assertEquals(Color.White, dhunColorScheme(ColorTheme.MONO, true).primary)
        assertEquals(Color.White, dhunColorScheme(ColorTheme.MONO, false).background)
        assertEquals(Color.Black, dhunColorScheme(ColorTheme.MONO, false).primary)
    }
}
