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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ca0scorp.iptvmonitor.data.AccountStatus
import com.ca0scorp.iptvmonitor.data.IptvAccountDetails
import com.ca0scorp.iptvmonitor.data.IptvChecker
import com.ca0scorp.iptvmonitor.ui.AccountDetailScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { IptvMonitorApp() } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun IptvMonitorApp() {
    val checker = remember { IptvChecker() }
    val scope = rememberCoroutineScope()
    var mode by remember { mutableIntStateOf(0) }
    var urlInput by remember { mutableStateOf("") }
    var accounts by remember { mutableStateOf<List<IptvAccountDetails>>(emptyList()) }
    var selected by remember { mutableStateOf<IptvAccountDetails?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    Scaffold(topBar = {
        TopAppBar(
            title = { Column {
                Text("IPTV Monitor")
                Text("Comprobador de cuentas", style = MaterialTheme.typography.labelMedium)
            } },
            actions = { TextButton(onClick = { accounts = emptyList(); selected = null; message = "Resultados limpiados." }) { Text("Limpiar") } }
        )
    }) { padding ->
        if (selected != null) {
            Column(Modifier.fillMaxSize().padding(padding)) {
                TextButton(onClick = { selected = null }, modifier = Modifier.padding(horizontal = 8.dp)) { Text("← Volver a resultados") }
                AccountDetailScreen(account = selected!!, modifier = Modifier.weight(1f))
            }
        } else {
            Column(
                Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(selected = mode == 0, onClick = { mode = 0 }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Una lista") }
                    SegmentedButton(selected = mode == 1, onClick = { mode = 1 }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Varias listas") }
                }
                Text(
                    if (mode == 0) "Pega una URL para consultar la información que publique el proveedor."
                    else "Pega una URL por línea. Las consultas se ejecutan secuencialmente.",
                    style = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = urlInput,
                    onValueChange = { urlInput = it },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 110.dp, max = 200.dp),
                    label = { Text(if (mode == 0) "URL de la lista" else "Una URL por línea") },
                    placeholder = { Text("https://servidor.example/get.php?username=…&password=…") },
                    minLines = if (mode == 0) 2 else 4,
                    maxLines = 7
                )
                Button(
                    onClick = {
                        val urls = (if (mode == 0) urlInput.lineSequence().firstOrNull().orEmpty() else urlInput)
                            .lines().map(String::trim).filter(String::isNotBlank).distinct()
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
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.padding(start = 8.dp))
                        Text("Comprobando…")
                    } else Text(if (mode == 0) "Consultar cuenta" else "Consultar todas")
                }
                message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary) }
                if (accounts.isEmpty()) {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Sin comprobaciones", style = MaterialTheme.typography.titleMedium)
                            Text("Los resultados aparecerán aquí. Vencimiento y conexiones requieren una API compatible.", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                } else {
                    Text("Resultados (${accounts.size})", style = MaterialTheme.typography.titleMedium)
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(accounts, key = { it.id }) { account ->
                            Card(Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Column(Modifier.weight(1f)) {
                                            Text(account.accountName ?: account.username ?: "Cuenta IPTV", style = MaterialTheme.typography.titleMedium)
                                            Text("Estado: ${account.accountStatus.labelForUi()}", style = MaterialTheme.typography.bodySmall)
                                        }
                                        TextButton(onClick = { selected = account }) { Text("Detalles") }
                                    }
                                    Text("Vence: ${account.expiresAt?.toString() ?: "No disponible"}", style = MaterialTheme.typography.bodySmall)
                                    Text("Conexiones: ${account.connections.activeConnections ?: "—"} / ${account.connections.maxConnections ?: "—"}", style = MaterialTheme.typography.bodySmall)
                                    account.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun AccountStatus.labelForUi(): String = when (this) {
    AccountStatus.ACTIVE -> "Activa"
    AccountStatus.INACTIVE -> "Inactiva"
    AccountStatus.EXPIRED -> "Vencida"
    AccountStatus.TRIAL -> "Prueba"
    AccountStatus.UNKNOWN -> "Desconocido"
}
