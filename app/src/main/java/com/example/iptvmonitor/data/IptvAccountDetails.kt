package com.example.iptvmonitor.data

data class IptvAccountDetails(
    val id: String,
    val sourceUrl: String,
    val accountName: String? = null,
    val username: String? = null,
    val hasPassword: Boolean = false,
    val accountType: String? = null,
    val accountStatus: String? = null,
    val createdAt: Long? = null,
    val expiresAt: Long? = null,
    val activeConnections: Int? = null,
    val maxConnections: Int? = null,
    val supportedFormats: List<String>? = null,
    val serverUrl: String? = null,
    val httpPort: String? = null,
    val httpsPort: String? = null,
    val rtmpPort: String? = null,
    val protocol: String? = null,
    val serverTime: String? = null,
    val timeZone: String? = null,
    val serverStatus: String = "UNKNOWN",
    val checkedAt: Long? = null,
    val error: String? = null
) {
    fun daysRemaining(nowEpochSeconds: Long = System.currentTimeMillis() / 1000): Long? =
        expiresAt?.let { expiry ->
            if (expiry <= nowEpochSeconds) -1L else (expiry - nowEpochSeconds) / 86_400
        }
}
