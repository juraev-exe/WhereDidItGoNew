package com.wherediditgo.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onResume() {
        super.onResume();
        refreshBalanceWidgets();
    }

    /**
     * Nudges any placed BalanceWidgetProvider instances to redraw immediately, so the widget
     * reflects fresh data as soon as the user reopens the app rather than waiting for the next
     * 30-minute updatePeriodMillis cycle. Sending ACTION_APPWIDGET_UPDATE is the standard way to
     * request an out-of-cycle refresh; onUpdate() re-reads SharedPreferences and redraws.
     */
    private void refreshBalanceWidgets() {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        ComponentName provider = new ComponentName(this, BalanceWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(provider);
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        Intent updateIntent = new Intent(this, BalanceWidgetProvider.class);
        updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
        sendBroadcast(updateIntent);
    }
}
