package com.wherediditgo.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.widget.RemoteViews;

/**
 * Home-screen "this month" balance widget.
 *
 * Reads plain string values written by the web app (see src/services/native/widget.ts) via
 * Capacitor's @capacitor/preferences plugin, which on Android persists to a SharedPreferences
 * file literally named "CapacitorStorage" (see PreferencesConfiguration.DEFAULTS.group in
 * node_modules/@capacitor/preferences). We read that same file directly rather than going
 * through the plugin, since AppWidgetProvider runs outside of any WebView/Capacitor bridge.
 *
 * Values are already-formatted display strings (e.g. spend "72.54", currency symbol "$") —
 * this provider does no numeric formatting of its own, it only lays them out.
 */
public class BalanceWidgetProvider extends AppWidgetProvider {

    static final String PREFS_NAME = "CapacitorStorage";
    static final String KEY_MONTH_SPEND = "widget_month_spend";
    static final String KEY_MONTH_INCOME = "widget_month_income";
    static final String KEY_CURRENCY_SYMBOL = "widget_currency_symbol";

    private static final String PLACEHOLDER = "—"; // em dash

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String currencySymbol = readOrDefault(prefs, KEY_CURRENCY_SYMBOL, "");
        String monthSpend = readOrDefault(prefs, KEY_MONTH_SPEND, null);
        String monthIncome = readOrDefault(prefs, KEY_MONTH_INCOME, null);

        String spendText = monthSpend != null ? currencySymbol + monthSpend : PLACEHOLDER;
        String incomeText = monthIncome != null
            ? context.getString(R.string.widget_income_line_format, currencySymbol + monthIncome)
            : PLACEHOLDER;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_balance);
        views.setTextViewText(R.id.widget_month_label, context.getString(R.string.app_name));
        views.setTextViewText(R.id.widget_spend_amount, spendText);
        views.setTextViewText(R.id.widget_income_line, incomeText);

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String readOrDefault(SharedPreferences prefs, String key, String fallback) {
        String value = prefs.getString(key, null);
        if (TextUtils.isEmpty(value)) {
            return fallback;
        }
        return value;
    }
}
