plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.ca0scorp.iptvmonitor"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.ca0scorp.iptvmonitor"
        minSdk = 26
        targetSdk = 35
        // Use a monotonically increasing code for each GitHub Actions build.
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1
        versionName = "0.1.${System.getenv("GITHUB_RUN_NUMBER") ?: "0"}"
    }
    signingConfigs {
        create("stableDebug") {
            val signingStoreFile = System.getenv("IPTV_SIGNING_STORE_FILE")
            if (!signingStoreFile.isNullOrBlank()) {
                storeFile = file(signingStoreFile)
                storePassword = System.getenv("IPTV_SIGNING_STORE_PASSWORD")
                keyAlias = System.getenv("IPTV_SIGNING_KEY_ALIAS")
                keyPassword = System.getenv("IPTV_SIGNING_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        getByName("debug") {
            // If a stable keystore is configured in GitHub Secrets, reuse it for every APK.
            if (!System.getenv("IPTV_SIGNING_STORE_FILE").isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("stableDebug")
            }
        }
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.03")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
