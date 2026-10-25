package com.example.iptvmonitor.data

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.net.URLEncoder
import java.util.UUID

class IptvChecker {
    fun check(input: String, displayName: String? = null): IptvAccountDetails {
        val trimmed = input.trim()
        val id = UUID.randomUUID().toString()
        val now = System.currentTimeMillis() / 1000
        if (trimmed.isBlank()) return IptvAccountDetails(id, trimmed, accountName = displayName, error = "La URL está vacía.", checkedAt = now)

        return try {
            val uri = URI(trimmed)
            val params = parseQuery(uri.rawQuery.orEmpty())
            val username = params["username"]
            val password = params["password"]
            if (uri.scheme !in listOf("http", "https") || uri.host.isNullOrBlank()) {
                return IptvAccountDetails(id, trimmed, accountName = displayName, error = "La URL debe usar HTTP o HTTPS y tener un servidor válido.", checkedAt = now)
            }
            if (username.isNullOrBlank() || password.isNullOrBlank()) {
                return IptvAccountDetails(
                    id, trimmed, accountName = displayName, serverUrl = "${uri.scheme}://${uri.rawAuthority}",
                    error = "URL genérica detectada. No se encontraron parámetros username/password; no se pueden obtener vencimiento ni conexiones mediante la API compatible.",
                    checkedAt = now
                )
            }

            // Use the origin only: playlist paths such as /get.php or /live/... are not API base paths.
            val base = "${uri.scheme}://${uri.rawAuthority}"
            val apiUrl = URL("$base/player_api.php?username=${encode(username)}&password=${encode(password)}")
            val connection = (apiUrl.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8_000
                readTimeout = 10_000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "IPTV-Monitor/0.1")
            }
            try {
                val code = connection.responseCode
                if (code !in 200..299) {
                    return IptvAccountDetails(id, trimmed, accountName = displayName, username = username, hasPassword = true, serverUrl = base, serverStatus = "ONLINE", error = "El servidor respondió HTTP $code; no se pudo leer la información de cuenta.", checkedAt = now)
                }
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(body)
                val user = json.optJSONObject("user_info")
                val server = json.optJSONObject("server_info")
                if (user == null) {
                    return IptvAccountDetails(id, trimmed, accountName = displayName, username = username, hasPassword = true, serverUrl = base, serverStatus = "ONLINE", error = "Respuesta recibida, pero no contiene user_info compatible con Xtream Codes.", checkedAt = now)
                }
                fun str(obj: JSONObject?, key: String): String? =
                    obj?.optString(key)?.takeIf { !it.isNullOrBlank() && it != "null" }
                fun epoch(key: String): Long? = user.optString(key).toLongOrNull()?.takeIf { it > 0L }
                val formats = user.optJSONArray("allowed_output_formats")?.let { arr ->
                    (0 until arr.length()).mapNotNull { arr.optString(it).takeIf(String::isNotBlank) }
                }
                val trial = str(user, "is_trial") in listOf("1", "true", "True")
                IptvAccountDetails(
                    id = id, sourceUrl = trimmed, accountName = displayName,
                    username = str(user, "username") ?: username, hasPassword = true,
                    accountType = if (trial) "Trial account" else "Tipo no especificado por API",
                    accountStatus = str(user, "status"),
                    createdAt = epoch("created_at"), expiresAt = epoch("exp_date"),
                    activeConnections = str(user, "active_cons")?.toIntOrNull(),
                    maxConnections = str(user, "max_connections")?.toIntOrNull(),
                    supportedFormats = formats,
                    serverUrl = str(server, "url") ?: base,
                    httpPort = str(server, "port"), httpsPort = str(server, "https_port"),
                    rtmpPort = str(server, "rtmp_port"), protocol = uri.scheme.uppercase(),
                    serverTime = str(server, "time_now"), timeZone = str(server, "timezone"),
                    serverStatus = "ONLINE", checkedAt = now
                )
            } finally {
                connection.disconnect()
            }
        } catch (_: java.net.SocketTimeoutException) {
            IptvAccountDetails(id, trimmed, accountName = displayName, serverStatus = "OFFLINE", error = "Tiempo de espera agotado: el servidor no respondió a tiempo.", checkedAt = now)
        } catch (e: Exception) {
            IptvAccountDetails(id, trimmed, accountName = displayName, serverStatus = "UNKNOWN", error = e.message?.take(240) ?: "No se pudo analizar la URL.", checkedAt = now)
        }
    }

    private fun parseQuery(query: String): Map<String, String> = query.split("&").mapNotNull { part ->
        val pair = part.split("=", limit = 2)
        if (pair.isEmpty()) null else decode(pair[0]) to decode(pair.getOrElse(1) { "" })
    }.toMap()

    private fun encode(value: String) = URLEncoder.encode(value, Charsets.UTF_8.name())
    private fun decode(value: String) = java.net.URLDecoder.decode(value, Charsets.UTF_8.name())
}
