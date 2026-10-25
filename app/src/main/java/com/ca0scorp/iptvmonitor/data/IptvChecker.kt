package com.ca0scorp.iptvmonitor.data

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.net.URLEncoder
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID

class IptvChecker {
    fun check(input: String, displayName: String? = null): IptvAccountDetails {
        val id = UUID.randomUUID().toString()
        val checkedAt = Instant.now()
        val raw = input.trim()
        if (raw.isBlank()) {
            return IptvAccountDetails(id = id, accountName = displayName, lastCheckedAt = checkedAt, error = "La URL está vacía.")
        }

        return try {
            val uri = URI(raw)
            if (uri.scheme !in listOf("http", "https") || uri.host.isNullOrBlank()) {
                return IptvAccountDetails(id = id, accountName = displayName, lastCheckedAt = checkedAt, error = "La URL debe usar HTTP o HTTPS y tener un servidor válido.")
            }

            val params = parseQuery(uri.rawQuery.orEmpty())
            val username = params["username"]
            val password = params["password"]
            val baseUrl = "${uri.scheme}://${uri.rawAuthority}"
            if (username.isNullOrBlank() || password.isNullOrBlank()) {
                return IptvAccountDetails(
                    id = id,
                    accountName = displayName,
                    server = ServerInfo(serverUrl = baseUrl, protocol = uri.scheme.uppercase()),
                    serverTime = ServerTimeInfo(status = ServerStatus.UNKNOWN),
                    lastCheckedAt = checkedAt,
                    error = "URL genérica detectada. No incluye username/password reconocibles; el vencimiento y las conexiones no se pueden consultar con este formato."
                )
            }

            val apiUrl = URL("$baseUrl/player_api.php?username=${encode(username)}&password=${encode(password)}")
            val connection = (apiUrl.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8_000
                readTimeout = 10_000
                instanceFollowRedirects = false
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "IPTV-Monitor/0.1")
            }
            try {
                val code = connection.responseCode
                if (code !in 200..299) {
                    return IptvAccountDetails(
                        id = id, accountName = displayName, username = username, credentialsDetected = true,
                        server = ServerInfo(serverUrl = baseUrl, protocol = uri.scheme.uppercase()),
                        serverTime = ServerTimeInfo(status = ServerStatus.ONLINE),
                        lastCheckedAt = checkedAt,
                        error = "El servidor respondió HTTP $code; no se pudo leer la información de cuenta."
                    )
                }

                val body = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(body)
                val user = json.optJSONObject("user_info")
                val server = json.optJSONObject("server_info")
                if (user == null) {
                    return IptvAccountDetails(
                        id = id, accountName = displayName, username = username, credentialsDetected = true,
                        server = ServerInfo(serverUrl = baseUrl, protocol = uri.scheme.uppercase()),
                        serverTime = ServerTimeInfo(status = ServerStatus.ONLINE),
                        lastCheckedAt = checkedAt,
                        error = "El servidor respondió, pero no devolvió user_info compatible con Xtream Codes."
                    )
                }

                fun string(obj: JSONObject?, key: String): String? =
                    obj?.optString(key)?.takeIf { !it.isNullOrBlank() && it != "null" && it != "0" }
                fun number(obj: JSONObject, key: String): Int? =
                    obj.optString(key).toIntOrNull()?.takeIf { it >= 0 }
                fun epoch(key: String): Instant? =
                    user.optString(key).toLongOrNull()?.takeIf { it > 0L }?.let(Instant::ofEpochSecond)

                val rawStatus = string(user, "status")
                val expiresAt = epoch("exp_date")
                val isTrial = string(user, "is_trial") in listOf("1", "true", "True")
                val accountStatus = when {
                    rawStatus.equals("Active", true) && isTrial -> AccountStatus.TRIAL
                    rawStatus.equals("Active", true) -> AccountStatus.ACTIVE
                    rawStatus.equals("Expired", true) -> AccountStatus.EXPIRED
                    rawStatus.equals("Disabled", true) || rawStatus.equals("Inactive", true) -> AccountStatus.INACTIVE
                    expiresAt != null && expiresAt.isBefore(Instant.now()) -> AccountStatus.EXPIRED
                    else -> AccountStatus.UNKNOWN
                }
                val formats = user.optJSONArray("allowed_output_formats")?.let { array ->
                    (0 until array.length()).mapNotNull { array.optString(it).takeIf(String::isNotBlank) }
                }
                val timeNow = parseServerTime(string(server, "time_now"))
                val timezone = string(server, "timezone")
                val serverInfo = ServerInfo(
                    serverUrl = string(server, "url") ?: baseUrl,
                    httpPort = string(server, "port")?.toIntOrNull(),
                    httpsPort = string(server, "https_port")?.toIntOrNull(),
                    rtmpPort = string(server, "rtmp_port")?.toIntOrNull(),
                    protocol = uri.scheme.uppercase()
                )
                IptvAccountDetails(
                    id = id,
                    accountName = displayName,
                    username = string(user, "username") ?: username,
                    hasSavedPassword = false,
                    credentialsDetected = true,
                    accountType = if (isTrial) "Trial account" else string(user, "account_type") ?: "No especificado por el proveedor",
                    accountStatus = accountStatus,
                    createdAt = epoch("created_at"),
                    expiresAt = expiresAt,
                    connections = ConnectionInfo(
                        activeConnections = number(user, "active_cons"),
                        maxConnections = number(user, "max_connections")
                    ),
                    supportedFormats = formats,
                    server = serverInfo,
                    serverTime = ServerTimeInfo(serverTime = timeNow, timeZone = timezone, status = ServerStatus.ONLINE),
                    lastCheckedAt = checkedAt
                )
            } finally {
                connection.disconnect()
            }
        } catch (_: java.net.SocketTimeoutException) {
            IptvAccountDetails(id = id, accountName = displayName, serverTime = ServerTimeInfo(status = ServerStatus.OFFLINE), lastCheckedAt = checkedAt, error = "Tiempo de espera agotado: el servidor no respondió a tiempo.")
        } catch (_: Exception) {
            // Do not surface exception messages: they can contain the original URL and its credentials.
            IptvAccountDetails(id = id, accountName = displayName, serverTime = ServerTimeInfo(status = ServerStatus.UNKNOWN), lastCheckedAt = checkedAt, error = "No se pudo analizar la URL o consultar la API. Revisa el formato y la conectividad.")
        }
    }

    private fun parseQuery(query: String): Map<String, String> = query.split("&").mapNotNull { part ->
        val pair = part.split("=", limit = 2)
        if (pair.isEmpty()) null else decode(pair[0]) to decode(pair.getOrElse(1) { "" })
    }.toMap()

    private fun encode(value: String) = URLEncoder.encode(value, Charsets.UTF_8.name())
    private fun decode(value: String) = java.net.URLDecoder.decode(value, Charsets.UTF_8.name())

    private fun parseServerTime(value: String?): Instant? {
        if (value.isNullOrBlank()) return null
        return runCatching { Instant.parse(value) }.getOrNull()
            ?: runCatching { LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")).toInstant(ZoneOffset.UTC) }.getOrNull()
    }
}
