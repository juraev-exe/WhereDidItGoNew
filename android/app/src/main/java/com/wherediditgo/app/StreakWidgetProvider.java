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
 * Daily Streak Home Screen Widget showing consecutive days and logging status.
 */
public class StreakWidgetProvider extends AppWidgetProvider {

    static final String PREFS_NAME = "CapacitorStorage";
    static final String KEY_STREAK_CURRENT = "widget_streak_current";
    static final String KEY_STREAK_ACTIVE_TODAY = "widget_streak_active_today";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String currentStreakStr = readOrDefault(prefs, KEY_STREAK_CURRENT, "0");
        String activeTodayStr = readOrDefault(prefs, KEY_STREAK_ACTIVE_TODAY, "false");
        boolean activeToday = "true".equalsIgnoreCase(activeTodayStr);

        int streakNum = 0;
        try {
            streakNum = Integer.parseInt(currentStreakStr);
        } catch (NumberFormatException ignored) {}

        String streakDisplay = streakNum + (streakNum == 1 ? " day" : " days");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak);
        views.setTextViewText(R.id.widget_streak_count, streakDisplay);

        if (activeToday) {
            views.setTextViewText(R.id.widget_streak_status, context.getString(R.string.widget_streak_status_active));
            views.setTextColor(R.id.widget_streak_status, Color.parseColor("#34D399")); // Emerald
        } else {
            views.setTextViewText(R.id.widget_streak_status, context.getString(R.string.widget_streak_status_pending));
            views.setTextColor(R.id.widget_streak_status, Color.parseColor("#F59E0B")); // Amber
        }

        // Tap opens app (or quick add if not logged today)
        Intent intent;
        if (!activeToday) {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse("wherediditgo://add"));
        } else {
            intent = new Intent(context, MainActivity.class);
        }
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId + 3000,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_streak_root, pendingIntent);

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
