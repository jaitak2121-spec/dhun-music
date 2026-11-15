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
        progress.animateTo(1f, tween(760, easing = LinearEasing))
        finished = true
    }
    val foreground = MaterialTheme.colorScheme.onBackground
    Box(
        modifier = Modifier.fillMaxSize()
            .graphicsLayer {
                alpha = 1f - ((progress.value - 0.62f) / 0.38f).coerceIn(0f, 1f)
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
                    repeat(2) { ring ->
                        drawCircle(
                            color = foreground.copy(alpha = (1f - progress.value) * 0.10f),
                            radius = (48f + ring * 16f + progress.value * 24f).dp.toPx(),
                            style = Stroke(1.dp.toPx()),
                        )
                    }
                }
                Icon(
                    painter = painterResource(R.drawable.ic_dhun_mark),
                    contentDescription = null,
                    tint = foreground,
                    modifier = Modifier.size(128.dp).graphicsLayer {
                        val reveal = FastOutSlowInEasing.transform((progress.value * 2f).coerceIn(0f, 1f))
                        scaleX = 0.88f + reveal * 0.12f
                        scaleY = scaleX
                        alpha = (progress.value / 0.18f).coerceIn(0f, 1f)
                    },
                )
            }
            Text("dhun", style = MaterialTheme.typography.displayLarge, color = foreground)
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(R.string.dhun_home_tagline),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
