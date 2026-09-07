package com.harmanrathi.applock;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.harmanrathi.applock.plugin.HrtaAppLockPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HrtaAppLockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
