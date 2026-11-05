<?php

use App\Http\Controllers\Api\ChatApiController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/chats', [ChatApiController::class, 'index']);
    Route::post('/chats/open/{user}', [ChatApiController::class, 'openOrCreate']);
    Route::get('/chats/{chat}', [ChatApiController::class, 'show']);
    Route::post('/chats/{chat}/messages', [ChatApiController::class, 'storeMessage']);
});
