package com.wherediditgo.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();
        refreshAllWidgets();
    }

    /**
     * Nudges any placed widgets to redraw immediately, reflecting fresh balances
     * and streaks as soon as the user interacts with the app.
     */
    private void refreshAllWidgets() {
        refreshProvider(BalanceWidgetProvider.class);
        refreshProvider(StreakWidgetProvider.class);
    }

    private void refreshProvider(Class<?> providerClass) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        ComponentName provider = new ComponentName(this, providerClass);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(provider);
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        Intent updateIntent = new Intent(this, providerClass);
        updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
        sendBroadcast(updateIntent);
    }
}
