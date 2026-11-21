# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve line numbers for Play Console crash deobfuscation while obfuscating names.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep custom Capacitor plugin and Android AppWidget entry points.
-keep public class com.wherediditgo.app.PrivacyScreenPlugin { *; }
-keep public class com.wherediditgo.app.*WidgetProvider { *; }
