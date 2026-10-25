package com.ca0scorp.iptvmonitor.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

/**
 * Stores account metadata locally. Raw URLs and passwords are deliberately not persisted.
 */
class SavedAccountsStore(context: Context) {
    private val preferences = context.getSharedPreferences("iptv_monitor_saved_accounts", Context.MODE_PRIVATE)
    private val key = "saved_accounts"

    fun load(): List<IptvAccountDetails> = runCatching {
        val array = JSONArray(preferences.getString(key, "[]") ?: "[]")
        (0 until array.length()).mapNotNull { index ->
            runCatching { decode(array.getJSONObject(index)) }.getOrNull()
        }
    }.getOrDefault(emptyList())

    fun save(accounts: List<IptvAccountDetails>) {
        val array = JSONArray()
        accounts.forEach { array.put(encode(it)) }
        preferences.edit().putString(key, array.toString()).apply()
    }

    private fun encode(account: IptvAccountDetails) = JSONObject().apply {
        put("id", account.id)
        put("accountName", account.accountName.jsonValue())
        put("username", account.username.jsonValue())
        put("credentialsDetected", account.credentialsDetected)
        put("accountType", account.accountType.jsonValue())
        put("accountStatus", account.accountStatus.name)
        put("createdAt", account.createdAt?.toString().jsonValue())
        put("expiresAt", account.expiresAt?.toString().jsonValue())
        put("activeConnections", account.connections.activeConnections.jsonValue())
        put("maxConnections", account.connections.maxConnections.jsonValue())
        put("supportedFormats", account.supportedFormats?.let { formats -> JSONArray().apply { formats.forEach { put(it) } } } ?: JSONObject.NULL)
        put("serverUrl", account.server.serverUrl.jsonValue())
        put("httpPort", account.server.httpPort.jsonValue())
        put("httpsPort", account.server.httpsPort.jsonValue())
        put("rtmpPort", account.server.rtmpPort.jsonValue())
        put("protocol", account.server.protocol.jsonValue())
        put("serverTime", account.serverTime.serverTime?.toString().jsonValue())
        put("timeZone", account.serverTime.timeZone.jsonValue())
        put("serverStatus", account.serverTime.status.name)
        put("lastCheckedAt", account.lastCheckedAt?.toString().jsonValue())
        put("error", account.error.jsonValue())
    }

    private fun decode(json: JSONObject): IptvAccountDetails {
        fun string(name: String): String? = json.optString(name).takeUnless { it == "null" || it.isBlank() }
        fun int(name: String): Int? = if (json.isNull(name)) null else json.optInt(name)
        fun instant(name: String): Instant? = string(name)?.let { runCatching { Instant.parse(it) }.getOrNull() }
        val formats = if (json.isNull("supportedFormats")) null else json.optJSONArray("supportedFormats")?.let { array ->
            (0 until array.length()).map { array.optString(it) }
        }
        return IptvAccountDetails(
            id = string("id") ?: error("Missing saved account ID"),
            accountName = string("accountName"),
            username = string("username"),
            hasSavedPassword = false,
            credentialsDetected = json.optBoolean("credentialsDetected"),
            accountType = string("accountType"),
            accountStatus = runCatching { AccountStatus.valueOf(string("accountStatus") ?: "UNKNOWN") }.getOrDefault(AccountStatus.UNKNOWN),
            createdAt = instant("createdAt"),
            expiresAt = instant("expiresAt"),
            connections = ConnectionInfo(int("activeConnections"), int("maxConnections")),
            supportedFormats = formats,
            server = ServerInfo(
                serverUrl = string("serverUrl"),
                httpPort = int("httpPort"),
                httpsPort = int("httpsPort"),
                rtmpPort = int("rtmpPort"),
                protocol = string("protocol")
            ),
            serverTime = ServerTimeInfo(
                serverTime = instant("serverTime"),
                timeZone = string("timeZone"),
                status = runCatching { ServerStatus.valueOf(string("serverStatus") ?: "UNKNOWN") }.getOrDefault(ServerStatus.UNKNOWN)
            ),
            lastCheckedAt = instant("lastCheckedAt"),
            error = string("error")
        )
    }

    private fun String?.jsonValue(): Any = this ?: JSONObject.NULL
    private fun Int?.jsonValue(): Any = this ?: JSONObject.NULL
}
