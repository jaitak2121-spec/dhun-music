package io.github.jaitak2121spec.dhun.ui.components

import android.animation.ValueAnimator
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.jaitak2121spec.dhun.R
import io.github.jaitak2121spec.dhun.data.settings.AppSettings

@Composable
internal fun dhunMotionEnabled(): Boolean {
    val reduceMotion by AppSettings.reduceAnimation.collectAsStateWithLifecycle()
    return !reduceMotion && ValueAnimator.areAnimatorsEnabled()
}

/** Decorative overlay only: app initialization and playback continue underneath. */
@Composable
internal fun DhunLaunchIntro(showOnLaunch: Boolean) {
    val motion = dhunMotionEnabled()
    var finished by rememberSaveable { mutableStateOf(false) }
    if (!showOnLaunch || !motion || finished) return

    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        progress.animateTo(1f, tween(1150, easing = LinearEasing))
        finished = true
    }
    val foreground = MaterialTheme.colorScheme.onBackground
    Box(
        modifier = Modifier.fillMaxSize()
            .graphicsLayer {
                val exit = ((progress.value - 0.78f) / 0.22f).coerceIn(0f, 1f)
                alpha = 1f - exit
                scaleX = 1f + exit * 0.035f
                scaleY = scaleX
            }
            .background(MaterialTheme.colorScheme.background)
            .clearAndSetSemantics { }
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) awaitPointerEvent().changes.forEach { it.consume() }
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(160.dp), contentAlignment = Alignment.Center) {
                Canvas(Modifier.fillMaxSize()) {
                    val reveal = FastOutSlowInEasing.transform((progress.value / 0.55f).coerceIn(0f, 1f))
                    repeat(3) { ring ->
                        drawCircle(
                            color = foreground.copy(alpha = (1f - progress.value) * 0.07f),
                            radius = (40f + ring * 13f + reveal * 20f).dp.toPx(),
                            style = Stroke(1.dp.toPx()),
                        )
                    }
                    // A single drawn heartbeat leads into the approved earbud mark.
                    val wave = Path().apply {
                        moveTo(0f, size.height * 0.55f)
                        lineTo(size.width * 0.26f, size.height * 0.55f)
                        lineTo(size.width * 0.35f, size.height * 0.40f)
                        lineTo(size.width * 0.43f, size.height * 0.72f)
                        lineTo(size.width * 0.52f, size.height * 0.26f)
                        lineTo(size.width * 0.61f, size.height * 0.67f)
                        lineTo(size.width * 0.70f, size.height * 0.47f)
                        lineTo(size.width * 0.77f, size.height * 0.55f)
                        lineTo(size.width, size.height * 0.55f)
                    }
                    val measure = PathMeasure().apply { setPath(wave, false) }
                    val segment = Path()
                    measure.getSegment(0f, measure.length * reveal, segment, true)
                    val waveAlpha = (1f - ((progress.value - 0.30f) / 0.25f).coerceIn(0f, 1f))
                    drawPath(segment, foreground.copy(alpha = waveAlpha * 0.08f), style = Stroke(9.dp.toPx(), cap = StrokeCap.Round))
                    drawPath(segment, foreground.copy(alpha = waveAlpha), style = Stroke(1.5.dp.toPx(), cap = StrokeCap.Round))
                }
                Icon(
                    painter = painterResource(R.drawable.ic_dhun_mark),
                    contentDescription = null,
                    tint = foreground,
                    modifier = Modifier.size(128.dp).graphicsLayer {
                        val reveal = FastOutSlowInEasing.transform(((progress.value - 0.25f) / 0.30f).coerceIn(0f, 1f))
                        scaleX = 0.82f + reveal * 0.18f
                        scaleY = scaleX
                        alpha = reveal
                        rotationZ = (1f - reveal) * -8f
                    },
                )
            }
            Text(stringResource(R.string.app_name), style = MaterialTheme.typography.displayLarge, color = foreground,
                modifier = Modifier.graphicsLayer {
                    val reveal = FastOutSlowInEasing.transform(((progress.value - 0.30f) / 0.25f).coerceIn(0f, 1f))
                    alpha = reveal
                    translationY = (1f - reveal) * 14.dp.toPx()
                })
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(R.string.dhun_home_tagline),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.graphicsLayer {
                    val reveal = ((progress.value - 0.43f) / 0.22f).coerceIn(0f, 1f)
                    alpha = reveal
                    translationY = (1f - reveal) * 8.dp.toPx()
                },
            )
        }
    }
}

/** Shared by the frosted and liquid-glass mini players. */
@Composable
internal fun DhunPlayPauseIcon(playing: Boolean, tint: Color, size: Dp) {
    val motion = dhunMotionEnabled()
    val label = stringResource(if (playing) R.string.pause else R.string.play)
    Box(Modifier.semantics { contentDescription = label }) {
        AnimatedContent(
            targetState = playing,
            transitionSpec = {
                (fadeIn(tween(if (motion) 160 else 0)) +
                    scaleIn(tween(if (motion) 180 else 0), initialScale = 0.82f)) togetherWith
                    (fadeOut(tween(if (motion) 90 else 0)) +
                        scaleOut(tween(if (motion) 90 else 0), targetScale = 0.82f))
            },
            label = "dhunPlayPause",
        ) { state ->
            Icon(
                imageVector = if (state) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(size),
            )
        }
    }
}
