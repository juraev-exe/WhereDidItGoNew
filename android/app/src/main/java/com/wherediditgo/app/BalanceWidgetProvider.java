package com.wherediditgo.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.text.TextUtils;
import android.widget.RemoteViews;

/**
 * Home-screen 4x2 Balance Overview Widget with quick-add action.
 */
public class BalanceWidgetProvider extends AppWidgetProvider {

    static final String PREFS_NAME = "CapacitorStorage";
    static final String KEY_TOTAL_BALANCE = "widget_total_balance";
    static final String KEY_MONTH_SPEND = "widget_month_spend";
    static final String KEY_MONTH_INCOME = "widget_month_income";
    static final String KEY_CURRENCY_SYMBOL = "widget_currency_symbol";

    private static final String PLACEHOLDER = "—";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String currencySymbol = readOrDefault(prefs, KEY_CURRENCY_SYMBOL, "");
        String totalBalance = readOrDefault(prefs, KEY_TOTAL_BALANCE, null);
        String monthSpend = readOrDefault(prefs, KEY_MONTH_SPEND, null);
        String monthIncome = readOrDefault(prefs, KEY_MONTH_INCOME, null);

        String balanceText = totalBalance != null ? currencySymbol + totalBalance : PLACEHOLDER;
        String spendText = monthSpend != null ? currencySymbol + monthSpend : PLACEHOLDER;
        String incomeText = monthIncome != null ? currencySymbol + monthIncome : PLACEHOLDER;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_balance);
        views.setTextViewText(R.id.widget_balance_amount, balanceText);
        views.setTextViewText(R.id.widget_spend_amount, spendText);
        views.setTextViewText(R.id.widget_income_amount, incomeText);

        // Tap on card opens main app
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        // Tap on + button opens quick add transaction deep link
        Intent addIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("wherediditgo://add"));
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent addPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId + 2000,
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_quick_add_btn, addPendingIntent);

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
