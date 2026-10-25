package com.ca0scorp.iptvmonitor.data

import java.time.Instant

/** Normalized account information parsed from a supported IPTV provider response. */
enum class AccountStatus { ACTIVE, INACTIVE, EXPIRED, TRIAL, UNKNOWN }
enum class ServerStatus { ONLINE, OFFLINE, UNKNOWN }

data class ConnectionInfo(
    val activeConnections: Int? = null,
    val maxConnections: Int? = null
)

data class ServerInfo(
    val serverUrl: String? = null,
    val httpPort: Int? = null,
    val httpsPort: Int? = null,
    val rtmpPort: Int? = null,
    val protocol: String? = null
)

data class ServerTimeInfo(
    val serverTime: Instant? = null,
    val timeZone: String? = null,
    val status: ServerStatus = ServerStatus.UNKNOWN
)

/**
 * Nullable values mean the provider did not supply that field.
 * UNKNOWN means the status could not be established; it does not imply inactive/offline.
 */
data class IptvAccountDetails(
    val id: String,
    val accountName: String? = null,
    val username: String? = null,
    // Only indicates whether credentials are in secure storage; never store the password here.
    val hasSavedPassword: Boolean = false,
    val credentialsDetected: Boolean = false,
    val accountType: String? = null,
    val accountStatus: AccountStatus = AccountStatus.UNKNOWN,
    val createdAt: Instant? = null,
    val expiresAt: Instant? = null,
    val connections: ConnectionInfo = ConnectionInfo(),
    // null = not reported; empty list = provider reported no supported formats.
    val supportedFormats: List<String>? = null,
    val server: ServerInfo = ServerInfo(),
    val serverTime: ServerTimeInfo = ServerTimeInfo(),
    val lastCheckedAt: Instant? = null,
    val error: String? = null
)
