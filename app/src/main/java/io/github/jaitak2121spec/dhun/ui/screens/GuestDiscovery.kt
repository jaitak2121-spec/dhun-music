package io.github.jaitak2121spec.dhun.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import io.github.jaitak2121spec.dhun.R
import io.github.jaitak2121spec.dhun.ui.components.PAGE_GUTTER

/** Honest discovery entry points, not fabricated personalized recommendations. */
@Composable
internal fun GuestDiscovery(onDiscover: (String) -> Unit) {
    val titles = listOf(R.string.discovery_focus, R.string.discovery_unwind,
        R.string.discovery_energy, R.string.discovery_acoustic)
    val queries = listOf("instrumental focus music", "ambient chill music",
        "feel good music", "acoustic sessions")
    Column(
        Modifier.fillMaxWidth().padding(horizontal = PAGE_GUTTER, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(stringResource(R.string.discovery_subtitle),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 12.dp))
        repeat(2) { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(2) { column ->
                    val index = row * 2 + column
                    DiscoveryCard(
                        title = stringResource(titles[index]), index = index,
                        onClick = { onDiscover(queries[index]) }, modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun DiscoveryCard(title: String, index: Int, onClick: () -> Unit, modifier: Modifier) {
    val scheme = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(22.dp)
    Box(
        modifier.height(196.dp).clip(shape)
            .background(Brush.linearGradient(listOf(scheme.surfaceContainerHigh, scheme.surface)))
            .border(0.5.dp, scheme.onSurface.copy(alpha = 0.12f), shape)
            .clickable(onClickLabel = stringResource(R.string.search), onClick = onClick),
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val ink = scheme.primary.copy(alpha = 0.16f)
            when (index) {
                0 -> repeat(4) { ring ->
                    drawCircle(ink, size.width * (0.18f + ring * 0.09f),
                        Offset(size.width * 0.76f, size.height * 0.30f), style = Stroke(1.5.dp.toPx()))
                }
                1 -> repeat(5) { line ->
                    val y = size.height * (0.22f + line * 0.07f)
                    val path = Path().apply {
                        moveTo(-20f, y)
                        cubicTo(size.width * 0.25f, y - 55f, size.width * 0.65f, y + 60f, size.width + 20f, y)
                    }
                    drawPath(path, ink, style = Stroke(1.5.dp.toPx()))
                }
                2 -> repeat(8) { bar ->
                    val x = size.width * (0.23f + bar * 0.085f)
                    val half = (if (bar % 3 == 0) 0.17f else if (bar % 2 == 0) 0.11f else 0.07f) * size.height
                    drawLine(ink, Offset(x, size.height * 0.33f - half),
                        Offset(x, size.height * 0.33f + half), strokeWidth = 5.dp.toPx())
                }
                else -> repeat(5) { ring ->
                    drawCircle(ink, size.width * (0.13f + ring * 0.065f),
                        Offset(size.width * 0.65f, size.height * 0.26f), style = Stroke(2.dp.toPx()))
                }
            }
        }
        Text("0${index + 1}", style = MaterialTheme.typography.labelSmall,
            color = scheme.onSurfaceVariant, modifier = Modifier.padding(18.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, color = scheme.onSurface,
            modifier = Modifier.align(Alignment.BottomStart).padding(18.dp))
    }
}
