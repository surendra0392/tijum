<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;
use App\Providers\PortalAuthServiceProvider;

return [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    PortalAuthServiceProvider::class,
];
