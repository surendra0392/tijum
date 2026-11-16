<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('tijum:expire-reservations')->everyMinute();
Schedule::command('tijum:send-notification-reminders')->everyFiveMinutes();
Schedule::command('tijum:publish-scheduled-content')->everyMinute();
Schedule::command('tijum:rewards:process-expiry')->dailyAt('00:05');
Schedule::command('tijum:rewards:qualify-pending')->hourly();
Schedule::command('tijum:poll-push-receipts')->everyTenMinutes();
