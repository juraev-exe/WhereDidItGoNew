package com.wherediditgo.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.text.TextUtils;
import android.widget.RemoteViews;

/**
 * Home-screen 4x2 Budget Progress & Runway Widget with quick add and scan actions.
 */
public class BudgetWidgetProvider extends AppWidgetProvider {

    static final String PREFS_NAME = "CapacitorStorage";
    static final String KEY_CURRENCY_SYMBOL = "widget_currency_symbol";
    static final String KEY_BUDGET_SPENT = "widget_budget_spent";
    static final String KEY_BUDGET_LIMIT = "widget_budget_limit";
    static final String KEY_BUDGET_PERCENT = "widget_budget_percent";
    static final String KEY_BUDGET_STATUS = "widget_budget_status";
    static final String KEY_BUDGET_REMAINING = "widget_budget_remaining";
    static final String KEY_BUDGET_DAYS_LEFT = "widget_budget_days_left";

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
        String budgetSpent = readOrDefault(prefs, KEY_BUDGET_SPENT, null);
        String budgetLimit = readOrDefault(prefs, KEY_BUDGET_LIMIT, null);
        String budgetPercentStr = readOrDefault(prefs, KEY_BUDGET_PERCENT, "0");
        String budgetStatus = readOrDefault(prefs, KEY_BUDGET_STATUS, "on_track");
        String budgetRemaining = readOrDefault(prefs, KEY_BUDGET_REMAINING, null);
        String daysLeft = readOrDefault(prefs, KEY_BUDGET_DAYS_LEFT, null);

        int percent = 0;
        try {
            percent = Integer.parseInt(budgetPercentStr);
        } catch (NumberFormatException ignored) {}
        percent = Math.max(0, Math.min(100, percent));

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_budget);

        String spentText = budgetSpent != null ? currencySymbol + budgetSpent : PLACEHOLDER;
        String limitText = budgetLimit != null ? " / " + currencySymbol + budgetLimit : "";
        String remainingText = budgetRemaining != null ? currencySymbol + budgetRemaining : PLACEHOLDER;
        String daysText = daysLeft != null ? daysLeft + " days left" : PLACEHOLDER;

        views.setTextViewText(R.id.widget_budget_spent_amount, spentText);
        views.setTextViewText(R.id.widget_budget_limit_amount, limitText);
        views.setTextViewText(R.id.widget_budget_percent_text, percent + "%");
        views.setProgressBar(R.id.widget_budget_progress, 100, percent, false);
        views.setTextViewText(R.id.widget_budget_remaining_amount, remainingText);
        views.setTextViewText(R.id.widget_budget_days_left, daysText);

        // Status badge
        if ("over".equalsIgnoreCase(budgetStatus)) {
            views.setTextViewText(R.id.widget_budget_status_badge, context.getString(R.string.widget_budget_over));
            views.setTextColor(R.id.widget_budget_status_badge, Color.parseColor("#F87171")); // Red
            views.setTextColor(R.id.widget_budget_remaining_amount, Color.parseColor("#F87171"));
        } else if ("at_risk".equalsIgnoreCase(budgetStatus)) {
            views.setTextViewText(R.id.widget_budget_status_badge, context.getString(R.string.widget_budget_at_risk));
            views.setTextColor(R.id.widget_budget_status_badge, Color.parseColor("#FBBF24")); // Amber
            views.setTextColor(R.id.widget_budget_remaining_amount, Color.parseColor("#FBBF24"));
        } else {
            views.setTextViewText(R.id.widget_budget_status_badge, context.getString(R.string.widget_budget_on_track));
            views.setTextColor(R.id.widget_budget_status_badge, Color.parseColor("#34D399")); // Emerald
            views.setTextColor(R.id.widget_budget_remaining_amount, Color.parseColor("#34D399"));
        }

        // Tap card -> deep link to wherediditgo://budgets
        Intent budgetIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("wherediditgo://budgets"));
        budgetIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent budgetPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId + 4000,
            budgetIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_budget_root, budgetPendingIntent);

        // Tap scan button -> deep link to wherediditgo://scan
        Intent scanIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("wherediditgo://scan"));
        scanIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent scanPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId + 5000,
            scanIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_budget_scan_btn, scanPendingIntent);

        // Tap + button -> deep link to wherediditgo://add
        Intent addIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("wherediditgo://add"));
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent addPendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId + 6000,
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_budget_quick_add, addPendingIntent);

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
