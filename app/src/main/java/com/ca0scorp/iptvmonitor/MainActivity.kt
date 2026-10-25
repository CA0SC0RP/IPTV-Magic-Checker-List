package com.ca0scorp.iptvmonitor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.*
import kotlinx.coroutines.delay
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.ca0scorp.iptvmonitor.data.AccountStatus
import com.ca0scorp.iptvmonitor.data.IptvAccountDetails
import com.ca0scorp.iptvmonitor.data.IptvChecker
import com.ca0scorp.iptvmonitor.data.SavedAccountsStore
import com.ca0scorp.iptvmonitor.ui.AccountDetailScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF65E6D2),
                    onPrimary = Color(0xFF06201D),
                    secondary = Color(0xFFB7A6FF),
                    onSecondary = Color(0xFF211747),
                    tertiary = Color(0xFFFFC078),
                    background = Color(0xFF0A0F16),
                    surface = Color(0xFF111A25),
                    surfaceVariant = Color(0xFF202D3B),
                    onSurface = Color(0xFFEAF2FA),
                    onSurfaceVariant = Color(0xFF9EADBD),
                    error = Color(0xFFFF7D8A)
                )
            ) { IptvMonitorApp() }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun IptvMonitorApp() {
    val context = LocalContext.current
    val checker = remember { IptvChecker() }
    val savedStore = remember { SavedAccountsStore(context.applicationContext) }
    val scope = rememberCoroutineScope()
    var urlInput by remember { mutableStateOf("") }
    var accounts by remember { mutableStateOf<List<IptvAccountDetails>>(emptyList()) }
    var savedAccounts by remember { mutableStateOf(savedStore.load()) }
    var selected by remember { mutableStateOf<IptvAccountDetails?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var showAbout by remember { mutableStateOf(false) }
    var showWelcome by remember { mutableStateOf(!context.getSharedPreferences("iptv_monitor_ui", 0).getBoolean("welcome_seen", false)) }

    LaunchedEffect(showWelcome) {
        if (showWelcome) {
            delay(1600)
            showWelcome = false
            context.getSharedPreferences("iptv_monitor_ui", 0).edit().putBoolean("welcome_seen", true).apply()
        }
    }

    fun isSaved(account: IptvAccountDetails): Boolean =
        savedAccounts.any { it.username == account.username && it.server.serverUrl == account.server.serverUrl }

    fun saveAccount(account: IptvAccountDetails) {
        if (!isSaved(account)) {
            val updated = savedAccounts + account.copy(hasSavedPassword = false)
            savedStore.save(updated)
            savedAccounts = updated
            message = "Cuenta activa guardada en este dispositivo."
        }
    }

    fun removeSaved(account: IptvAccountDetails) {
        val updated = savedAccounts.filterNot { it.id == account.id }
        savedStore.save(updated)
        savedAccounts = updated
        message = "Cuenta quitada de guardadas."
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface,
                titleContentColor = MaterialTheme.colorScheme.onSurface
            ),
            title = { Column {
                Text("IPTV Monitor", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                Text("COMPROBADOR DE CUENTAS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            } },
            actions = {
                TextButton(onClick = { showAbout = true }) { Text("Acerca de") }
                TextButton(
                    enabled = !busy,
                    onClick = {
                        urlInput = ""
                        accounts = emptyList()
                        selected = null
                        message = "Búsqueda y resultados limpiados. Las cuentas guardadas se conservaron."
                    }
                ) { Text("Limpiar") }
            }
        )
    }) { padding ->
        if (selected != null) {
            Column(Modifier.fillMaxSize().padding(padding)) {
                TextButton(onClick = { selected = null }, modifier = Modifier.padding(horizontal = 8.dp)) {
                    Text("← Volver")
                }
                AccountDetailScreen(
                    account = selected!!,
                    modifier = Modifier.weight(1f),
                    isSaved = isSaved(selected!!),
                    onSave = { saveAccount(selected!!) }
                )
            }
        } else {
            Column(
                Modifier.fillMaxSize().padding(padding).imePadding().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("COMPROBACIÓN IPTV", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        Text("Revisa tus listas", style = MaterialTheme.typography.headlineSmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                        Text(
                            "Pega una URL o varias, una por línea. Se comprobarán en una sola operación.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                OutlinedTextField(
                    value = urlInput,
                    onValueChange = { urlInput = it },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 110.dp, max = 200.dp),
                    label = { Text("URL o URLs de tus listas") },
                    placeholder = { Text("Pega una URL por línea…") },
                    minLines = 3,
                    maxLines = 7
                )
                Button(
                    onClick = {
                        val urls = urlInput.lines()
                            .map(String::trim).filter(String::isNotBlank).distinct()
                        if (urls.isEmpty()) {
                            message = "Introduce al menos una URL."
                        } else if (!busy) {
                            busy = true
                            message = null
                            scope.launch {
                                val startIndex = accounts.size
                                val results = withContext(Dispatchers.IO) {
                                    urls.mapIndexed { index, url -> checker.check(url, "Cuenta ${startIndex + index + 1}") }
                                }
                                accounts = accounts + results
                                message = "Comprobación terminada: ${results.size} cuenta(s)."
                                busy = false
                            }
                        }
                    },
                    enabled = !busy && urlInput.isNotBlank(),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (busy) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                        Spacer(Modifier.padding(start = 8.dp))
                        Text("Comprobando…")
                    } else Text("Comprobar listas")
                }
                message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary) }

                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (accounts.isEmpty()) {
                        item(key = "empty-results") {
                            Card(
                                Modifier.fillMaxWidth(),
                                colors = androidx.compose.material3.CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface
                                )
                            ) {
                                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("Sin comprobaciones", style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        "Los resultados aparecerán aquí. Vencimiento y conexiones requieren una API compatible.",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                            }
                        }
                    } else {
                        item(key = "results-heading") {
                            Text("Resultados del escaneo (${accounts.size})", style = MaterialTheme.typography.titleMedium)
                        }
                        items(accounts, key = { "result-${it.id}" }) { account ->
                            Card(
                                Modifier.fillMaxWidth(),
                                colors = androidx.compose.material3.CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface
                                )
                            ) {
                                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Column(Modifier.weight(1f)) {
                                            Text(account.accountName ?: account.username ?: "Cuenta IPTV", style = MaterialTheme.typography.titleMedium)
                                            Text("Estado: ${account.accountStatus.labelForUi()}", style = MaterialTheme.typography.bodySmall)
                                        }
                                        TextButton(onClick = { selected = account }) { Text("Detalles") }
                                    }
                                    Text("Vence: ${account.expiresAt?.atZone(java.time.ZoneId.systemDefault())?.toLocalDate()?.toString() ?: "No disponible"}", style = MaterialTheme.typography.bodySmall)
                                    Text("Conexiones: ${account.connections.activeConnections ?: "—"} / ${account.connections.maxConnections ?: "—"}", style = MaterialTheme.typography.bodySmall)
                                    account.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                                    if (account.accountStatus == AccountStatus.ACTIVE || account.accountStatus == AccountStatus.TRIAL) {
                                        TextButton(
                                            onClick = { saveAccount(account) },
                                            enabled = !isSaved(account)
                                        ) {
                                            Text(if (isSaved(account)) "Guardada" else "Guardar cuenta activa")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item(key = "saved-heading") {
                        Text("Cuentas guardadas (${savedAccounts.size})", style = MaterialTheme.typography.titleMedium)
                    }
                    if (savedAccounts.isEmpty()) {
                        item(key = "saved-empty") {
                            Card(
                                Modifier.fillMaxWidth(),
                                colors = androidx.compose.material3.CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface
                                )
                            ) {
                                Text(
                                    "Aquí aparecerán las cuentas activas que guardes. Permanecen en este dispositivo aunque limpies el escaneo o cierres la app.",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    } else {
                        items(savedAccounts, key = { "saved-${it.id}" }) { account ->
                            Card(
                                Modifier.fillMaxWidth(),
                                colors = androidx.compose.material3.CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface
                                )
                            ) {
                                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Column(Modifier.weight(1f)) {
                                            Text(account.accountName ?: account.username ?: "Cuenta IPTV", style = MaterialTheme.typography.titleMedium)
                                            Text("Estado guardado: ${account.accountStatus.labelForUi()}", style = MaterialTheme.typography.bodySmall)
                                        }
                                        TextButton(onClick = { selected = account }) { Text("Detalles") }
                                    }
                                    Text("Servidor: ${account.server.serverUrl ?: "No disponible"}", style = MaterialTheme.typography.bodySmall)
                                    Text("Vence: ${account.expiresAt?.atZone(java.time.ZoneId.systemDefault())?.toLocalDate()?.toString() ?: "No disponible"}", style = MaterialTheme.typography.bodySmall)
                                    TextButton(onClick = { removeSaved(account) }) { Text("Quitar de guardadas") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showWelcome) {
        AlertDialog(
            onDismissRequest = {
                showWelcome = false
                context.getSharedPreferences("iptv_monitor_ui", 0).edit().putBoolean("welcome_seen", true).apply()
            },
            title = { Text("IPTV Monitor") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("▤  📺", style = MaterialTheme.typography.headlineLarge)
                    Text("Bienvenido al comprobador de listas IPTV", style = MaterialTheme.typography.titleMedium)
                    Text("CAOSCORP × ChatGPT", style = MaterialTheme.typography.bodyMedium)
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    showWelcome = false
                    context.getSharedPreferences("iptv_monitor_ui", 0).edit().putBoolean("welcome_seen", true).apply()
                }) { Text("Comenzar") }
            }
        )
    }

    if (showAbout) {
        AlertDialog(
            onDismissRequest = { showAbout = false },
            title = { Text("Acerca de IPTV Monitor") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Creado por CAOSCORP", style = MaterialTheme.typography.titleMedium)
                    Text("Desarrollado con asistencia de ChatGPT, de OpenAI, para apoyar el diseño, la programación y la resolución de problemas.")
                    Text("Una iniciativa que combina creatividad humana e inteligencia artificial para crear tecnología y compartirla con el mundo.")
                    Text("GRATUITO: esta aplicación se ofrece sin coste. No está autorizada su venta ni su redistribución comercial sin permiso de CAOSCORP.")
                    Text("Privacidad y seguridad: las consultas se comunican con los servidores IPTV indicados por el usuario. Utiliza fuentes de confianza y no compartas credenciales con terceros. No se garantiza ausencia absoluta de riesgos o malware.")
                    Text("CAOSCORP × ChatGPT · Versión 0.1.0")
                }
            },
            confirmButton = { TextButton(onClick = { showAbout = false }) { Text("Cerrar") }
            }
        )
    }
}

private fun AccountStatus.labelForUi(): String = when (this) {
    AccountStatus.ACTIVE -> "Activa"
    AccountStatus.INACTIVE -> "Inactiva"
    AccountStatus.EXPIRED -> "Vencida"
    AccountStatus.TRIAL -> "Prueba"
    AccountStatus.UNKNOWN -> "Desconocido"
}
