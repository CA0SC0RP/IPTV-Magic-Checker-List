package com.ca0scorp.iptvmonitor.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.time.Instant

/**
 * Stores account metadata locally. Passwords are encrypted with an AES key held by Android Keystore.
 * Raw input URLs are not persisted.
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

        val password = account.password?.takeIf { it.isNotBlank() }
        if (password != null) {
            val encrypted = encryptPassword(password)
            put("passwordIv", encrypted.first)
            put("passwordCiphertext", encrypted.second)
        } else {
            put("passwordIv", JSONObject.NULL)
            put("passwordCiphertext", JSONObject.NULL)
        }
    }

    private fun decode(json: JSONObject): IptvAccountDetails {
        fun string(name: String): String? = json.optString(name).takeUnless { it == "null" || it.isBlank() }
        fun int(name: String): Int? = if (json.isNull(name)) null else json.optInt(name)
        fun instant(name: String): Instant? = string(name)?.let { runCatching { Instant.parse(it) }.getOrNull() }
        val formats = if (json.isNull("supportedFormats")) null else json.optJSONArray("supportedFormats")?.let { array ->
            (0 until array.length()).map { array.optString(it) }
        }
        val password = runCatching {
            val iv = string("passwordIv") ?: return@runCatching null
            val ciphertext = string("passwordCiphertext") ?: return@runCatching null
            decryptPassword(iv, ciphertext)
        }.getOrNull()
        return IptvAccountDetails(
            id = string("id") ?: error("Missing saved account ID"),
            accountName = string("accountName"),
            username = string("username"),
            password = password,
            hasSavedPassword = !password.isNullOrBlank(),
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

    private fun encryptPassword(password: String): Pair<String, String> {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())
        val ciphertext = cipher.doFinal(password.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(cipher.iv, Base64.NO_WRAP) to
            Base64.encodeToString(ciphertext, Base64.NO_WRAP)
    }

    private fun decryptPassword(iv: String, ciphertext: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        val spec = GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP))
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), spec)
        return String(cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP)), Charsets.UTF_8)
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    private fun String?.jsonValue(): Any = this ?: JSONObject.NULL
    private fun Int?.jsonValue(): Any = this ?: JSONObject.NULL

    private companion object {
        const val KEY_ALIAS = "iptv_monitor_account_password_key"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
