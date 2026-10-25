package com.example.iptvmonitor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.iptvmonitor.data.IptvAccountDetails
import com.example.iptvmonitor.data.IptvChecker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { IptvMonitorApp() } }
    }
}

class MonitorViewModel : ViewModel() {
    private val checker = IptvChecker()
    var accounts by mutableStateOf<List<IptvAccountDetails>>(emptyList())
        private set
    var busy by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    fun checkUrls(text: String) {
        val urls = text.lines().map(String::trim).filter(String::isNotBlank).distinct()
        if (urls.isEmpty()) { message = "Pega una URL o una URL por línea."; return }
        if (busy) return
        viewModelScope.launch {
            busy = true
            message = null
            try {
                val results = withContext(Dispatchers.IO) {
                    urls.mapIndexed { index, url -> checker.check(url, "Cuenta ${accounts.size + index + 1}") }
                }
                accounts = accounts + results
                message = "Comprobación terminada: ${results.size} cuenta(s)."
            } catch (e: Exception) {
                message = e.message ?: "Ocurrió un error."
            } finally { busy = false }
        }
    }

    fun remove(account: IptvAccountDetails) { accounts = accounts.filterNot { it.id == account.id } }
    fun clear() { accounts = emptyList(); message = "Se limpiaron los resultados." }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IptvMonitorApp(vm: MonitorViewModel = viewModel()) {
    var mode by remember { mutableIntStateOf(0) }
    var urlInput by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<IptvAccountDetails?>(null) }

    Scaffold(topBar = {
        TopAppBar(title = {
            Column {
                Text("IPTV Monitor")
                Text("Comprobador de cuentas", style = MaterialTheme.typography.labelMedium)
            }
        }, actions = { TextButton(onClick = { vm.clear(); selected = null }) { Text("Limpiar") } })
    }) { padding ->
        if (selected != null) {
            AccountDetailScreen(selected!!, Modifier.padding(padding), onBack = { selected = null })
        } else {
            Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(selected = mode == 0, onClick = { mode = 0 }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Una lista") }
                    SegmentedButton(selected = mode == 1, onClick = { mode = 1 }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Varias listas") }
                }
                Text(if (mode == 0) "Pega una URL para consultar los datos disponibles." else "Pega una URL por línea. Las consultas se ejecutan secuencialmente.", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = urlInput, onValueChange = { urlInput = it },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp, max = 220.dp),
                    label = { Text(if (mode == 0) "URL de la lista" else "Una URL por línea") },
                    placeholder = { Text("https://servidor.example/get.php?username=…&password=…") },
                    minLines = if (mode == 0) 2 else 4, maxLines = 7
                )
                Button(onClick = {
                    vm.checkUrls(if (mode == 0) urlInput.lineSequence().firstOrNull().orEmpty() else urlInput)
                }, enabled = !vm.busy && urlInput.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                    if (vm.busy) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp)); Text("Comprobando…")
                    } else Text(if (mode == 0) "Consultar cuenta" else "Consultar todas")
                }
                vm.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary) }
                if (vm.accounts.isNotEmpty()) {
                    Text("Resultados (${vm.accounts.size})", style = MaterialTheme.typography.titleMedium)
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(vm.accounts, key = { it.id }) { account ->
                            AccountSummaryCard(account, onClick = { selected = account }, onRemove = { vm.remove(account) })
                        }
                    }
                } else EmptyState()
            }
        }
    }
}

@Composable
private fun EmptyState() {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Sin comprobaciones", style = MaterialTheme.typography.titleMedium)
            Text("Los resultados aparecerán aquí. El vencimiento y las conexiones dependen de una API compatible.", style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun AccountSummaryCard(account: IptvAccountDetails, onClick: () -> Unit, onRemove: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(account.accountName ?: "Cuenta IPTV", style = MaterialTheme.typography.titleMedium)
                    Text(account.username?.let { "Usuario: $it" } ?: "Usuario: No disponible", style = MaterialTheme.typography.bodySmall)
                }
                StatusChip(account.accountStatus, account.serverStatus, account.error)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                InfoMini("Días restantes", account.daysRemaining()?.let { if (it < 0) "Vencida" else it.toString() } ?: "No disponible")
                InfoMini("Conexiones", if (account.activeConnections != null || account.maxConnections != null) "${account.activeConnections ?: "—"} / ${account.maxConnections ?: "—"}" else "No disponible")
            }
            Text("Vence: ${formatEpoch(account.expiresAt)}", style = MaterialTheme.typography.bodySmall)
            if (account.error != null) Text(account.error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, maxLines = 3)
            TextButton(onClick = onRemove) { Text("Quitar resultado") }
        }
    }
}

@Composable
private fun InfoMini(label: String, value: String) {
    Column(Modifier.widthIn(min = 90.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun StatusChip(accountStatus: String?, serverStatus: String, error: String?) {
    val label = when {
        error != null && serverStatus == "OFFLINE" -> "Sin respuesta"
        accountStatus.equals("Active", true) -> "Activa"
        accountStatus.equals("Expired", true) -> "Vencida"
        accountStatus.equals("Disabled", true) -> "Inactiva"
        accountStatus.isNullOrBlank() -> "Desconocido"
        else -> accountStatus
    }
    AssistChip(onClick = {}, label = { Text(label) })
}

@Composable
private fun AccountDetailScreen(account: IptvAccountDetails, modifier: Modifier = Modifier, onBack: () -> Unit) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TextButton(onClick = onBack) { Text("← Volver a resultados") }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(account.accountName ?: "Cuenta IPTV", style = MaterialTheme.typography.headlineSmall)
                Text(account.username?.let { "Usuario: $it" } ?: "Usuario: No disponible", style = MaterialTheme.typography.bodyMedium)
            }
            StatusChip(account.accountStatus, account.serverStatus, account.error)
        }
        SectionCard("Welcome / Account Status") {
            DetailRow("Estado de cuenta", account.accountStatus ?: "No disponible")
            DetailRow("Días restantes", account.daysRemaining()?.let { if (it < 0) "Vencida" else "$it días" } ?: "No disponible")
            DetailRow("Estado del servidor", when (account.serverStatus) { "ONLINE" -> "Respondió"; "OFFLINE" -> "Sin respuesta"; else -> "Desconocido" })
            DetailRow("Última comprobación", formatEpoch(account.checkedAt))
            account.error?.let { DetailRow("Nota", it) }
        }
        SectionCard("Account Details") {
            DetailRow("Usuario", account.username ?: "No disponible")
            DetailRow("Contraseña", if (account.hasPassword) "Detectada en URL; oculta" else "No disponible")
            DetailRow("Tipo de cuenta", account.accountType ?: "No disponible")
            DetailRow("Fecha de creación", formatEpoch(account.createdAt))
            DetailRow("Fecha de vencimiento", formatEpoch(account.expiresAt))
        }
        SectionCard("Connections") {
            DetailRow("Conexiones activas", account.activeConnections?.toString() ?: "No disponible")
            DetailRow("Conexiones máximas", account.maxConnections?.toString() ?: "No disponible")
        }
        SectionCard("Supported Formats") {
            DetailRow("Formatos", account.supportedFormats?.takeIf { it.isNotEmpty() }?.joinToString(", ") ?: "No disponible")
        }
        SectionCard("Server Information") {
            DetailRow("Servidor URL", account.serverUrl ?: "No disponible")
            DetailRow("HTTP port", account.httpPort ?: "No disponible")
            DetailRow("HTTPS port", account.httpsPort ?: "No disponible")
            DetailRow("RTMP port", account.rtmpPort ?: "No disponible")
            DetailRow("Protocolo de la URL", account.protocol ?: "No disponible")
        }
        SectionCard("Server Time & Status") {
            DetailRow("Hora del servidor", account.serverTime ?: "No disponible")
            DetailRow("Zona horaria", account.timeZone ?: "No disponible")
            DetailRow("Estado reportado", account.accountStatus ?: "No disponible")
            DetailRow("Estado de conexión", when (account.serverStatus) { "ONLINE" -> "Respondió"; "OFFLINE" -> "Sin respuesta"; else -> "Desconocido" })
        }
        Text("La disponibilidad de cada campo depende de la respuesta del proveedor.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            HorizontalDivider()
            content()
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
        Text(label, modifier = Modifier.weight(0.9f), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, modifier = Modifier.weight(1.1f), style = MaterialTheme.typography.bodyMedium)
    }
}

private fun formatEpoch(epochSeconds: Long?): String {
    if (epochSeconds == null) return "No disponible"
    return try { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date(epochSeconds * 1000)) }
    catch (_: Exception) { "No disponible" }
}
