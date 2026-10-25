package com.ca0scorp.iptvmonitor.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.ca0scorp.iptvmonitor.data.AccountStatus
import com.ca0scorp.iptvmonitor.data.IptvAccountDetails
import com.ca0scorp.iptvmonitor.data.ServerStatus
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale
import kotlin.math.ceil

private val dateFormatter: DateTimeFormatter =
    DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM).withLocale(Locale.getDefault())

/** Receives a parsed model; does not create sample data or perform network requests. */
@Composable
fun AccountDetailScreen(
    account: IptvAccountDetails,
    modifier: Modifier = Modifier,
    now: Instant = Instant.now()
) {
    val accountName = account.accountName.cleanOrNull()
        ?: account.username.cleanOrNull()
        ?: "Cuenta IPTV"
    val daysRemaining = account.expiresAt?.let { expiry ->
        val seconds = Duration.between(now, expiry).seconds
        if (seconds <= 0) 0L else ceil(seconds / 86_400.0).toLong()
    }

    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Welcome / Account Status", style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(4.dp))
                Text(accountName, style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.width(8.dp))
            AssistChip(onClick = {}, label = { Text(account.accountStatus.label()) })
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard(
                title = "Días restantes",
                value = when {
                    account.expiresAt == null -> "No disponible"
                    account.expiresAt.isBefore(now) || account.accountStatus == AccountStatus.EXPIRED -> "Vencida"
                    else -> daysRemaining?.toString() ?: "No disponible"
                },
                modifier = Modifier.weight(1f)
            )
            MetricCard("Conexiones", connectionSummary(account), Modifier.weight(1f))
        }

        DetailSection("Account Details") {
            DetailRow("Usuario", account.username.maskUsername())
            DetailRow("Contraseña", when {
                account.hasSavedPassword -> "Guardada · protegida"
                account.credentialsDetected -> "•••••••• (no almacenada)"
                else -> "No disponible"
            })
            DetailRow("Tipo de cuenta", account.accountType.displayValue())
            DetailRow("Fecha de creación", account.createdAt.formatDate())
            DetailRow("Fecha de vencimiento", account.expiresAt.formatDate())
        }

        DetailSection("Connections") {
            DetailRow("Conexiones activas", account.connections.activeConnections.displayValue())
            DetailRow("Conexiones máximas", account.connections.maxConnections.displayValue())
            DetailRow("Disponibles", availableConnections(account))
        }

        DetailSection("Supported Formats") {
            when {
                account.supportedFormats == null -> DetailRow("Formatos", "No disponible")
                account.supportedFormats.isEmpty() -> DetailRow("Formatos", "El servidor no informó formatos")
                else -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    account.supportedFormats.distinct().forEach { format ->
                        AssistChip(onClick = {}, label = { Text(format) })
                    }
                }
            }
        }

        DetailSection("Server Information") {
            DetailRow("Servidor URL", account.server.serverUrl.displayValue())
            DetailRow("HTTP port", account.server.httpPort.displayValue())
            DetailRow("HTTPS port", account.server.httpsPort.displayValue())
            DetailRow("RTMP port", account.server.rtmpPort.displayValue())
            DetailRow("Protocolo", account.server.protocol.displayValue())
        }

        DetailSection("Server Time & Status") {
            DetailRow("Hora del servidor", account.serverTime.serverTime.formatDate())
            DetailRow("Zona horaria", account.serverTime.timeZone.displayValue())
            DetailRow("Estado del servidor", account.serverTime.status.label())
            DetailRow("Última comprobación", account.lastCheckedAt.formatDate())
            account.error?.let { DetailRow("Resultado", it) }
        }

        Text(
            "Los campos no disponibles no fueron proporcionados por la fuente o aún no se han verificado.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun MetricCard(title: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun DetailSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            HorizontalDivider()
            content(this)
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(label, modifier = Modifier.weight(0.9f), style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, modifier = Modifier.weight(1.1f), style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium)
    }
}

private fun AccountStatus.label(): String = when (this) {
    AccountStatus.ACTIVE -> "Activa"
    AccountStatus.INACTIVE -> "Inactiva"
    AccountStatus.EXPIRED -> "Vencida"
    AccountStatus.TRIAL -> "Prueba"
    AccountStatus.UNKNOWN -> "Desconocido"
}

private fun ServerStatus.label(): String = when (this) {
    ServerStatus.ONLINE -> "En línea"
    ServerStatus.OFFLINE -> "Sin conexión"
    ServerStatus.UNKNOWN -> "Desconocido"
}

private fun connectionSummary(account: IptvAccountDetails): String {
    val active = account.connections.activeConnections
    val maximum = account.connections.maxConnections
    return when {
        active != null && maximum != null -> "$active / $maximum"
        maximum != null -> "Máximo $maximum"
        active != null -> "$active activas"
        else -> "No disponible"
    }
}

private fun availableConnections(account: IptvAccountDetails): String {
    val active = account.connections.activeConnections
    val maximum = account.connections.maxConnections
    return if (active != null && maximum != null) {
        "${(maximum - active).coerceAtLeast(0)}"
    } else "No disponible"
}

private fun String?.cleanOrNull(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
private fun String?.displayValue(): String = cleanOrNull() ?: "No disponible"
private fun Int?.displayValue(): String = this?.toString() ?: "No disponible"

private fun String?.maskUsername(): String {
    val value = cleanOrNull() ?: return "No disponible"
    if (value.length <= 3) return "••••"
    return value.take(2) + "••••" + value.takeLast(1)
}

private fun Instant?.formatDate(): String {
    if (this == null) return "No disponible"
    return runCatching { dateFormatter.format(atZone(ZoneId.systemDefault())) }
        .getOrDefault("No disponible")
}
