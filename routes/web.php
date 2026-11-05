<?php

use App\Http\Controllers\ArcadeController;
use App\Http\Controllers\Auth\VerifyCodeController;
use App\Http\Controllers\CardGameController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChessController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\FriendshipController;
use App\Http\Controllers\LobbyController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicProfileController;
use App\Http\Controllers\RandomChatController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::get('/profile/{user}/poster', [PublicProfileController::class, 'show'])->name('profile.public');

Route::middleware('auth')->group(function () {
    Route::post('/email/verify-code', [VerifyCodeController::class, 'verify'])
        ->name('verification.verify-code');

    Route::post('/email/resend-code', [VerifyCodeController::class, 'resend'])
        ->name('verification.resend-code');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard');

    // Friendships: send a request, accept it, or decline/cancel/unfriend
    Route::post('friends/{user}', [FriendshipController::class, 'store'])->name('friends.store');
    Route::patch('friends/{user}', [FriendshipController::class, 'accept'])->name('friends.accept');
    Route::delete('friends/{user}', [FriendshipController::class, 'destroy'])->name('friends.destroy');

    // Chat (backend: Marvin) — rendered as the Ontmoeten pages
    Route::get('ontmoeten', [ChatController::class, 'ontmoeten'])->name('ontmoeten');
    Route::get('ontmoeten/berichten', [ChatController::class, 'index'])->name('chats.index');
    Route::get('ontmoeten/berichten/start/{user}', [ChatController::class, 'openOrCreate'])->name('chats.open');
    // Random chat: matchmaking queue + anonymous chats (the page polls `show`)
    Route::get('ontmoeten/random-chat', [RandomChatController::class, 'show'])->name('ontmoeten.random-chat');
    Route::prefix('ontmoeten/random-chat')->name('random-chat.')->controller(RandomChatController::class)->group(function () {
        Route::post('zoeken', 'search')->name('search');
        Route::delete('zoeken', 'cancel')->name('cancel');
        Route::post('{randomChat}/berichten', 'storeMessage')->name('messages.store');
        Route::post('{randomChat}/bewaren', 'save')->name('save');
        Route::post('{randomChat}/verlaten', 'leave')->name('leave');
        Route::post('{randomChat}/melden', 'report')->name('report');
    });
    Route::get('ontmoeten/berichten/{chat}', [ChatController::class, 'show'])->name('chats.show');
    Route::post('ontmoeten/berichten/{chat}/messages', [ChatController::class, 'storeMessage'])->name('chats.messages.store');

    // First visit: make your avatar (straight after registering), then into the Hotel
    Route::get('ontmoeten/poppetje', [LobbyController::class, 'avatar'])->name('hotel.avatar');
    Route::post('ontmoeten/poppetje', [LobbyController::class, 'storeAvatar'])->name('hotel.avatar.store');
    Route::get('ontmoeten/lobby', [LobbyController::class, 'show'])->name('ontmoeten.lobby');
    Route::post('ontmoeten/lobby/heartbeat', [LobbyController::class, 'heartbeat'])->name('ontmoeten.lobby.heartbeat');
    Route::post('ontmoeten/lobby/proposals', [LobbyController::class, 'proposeGame'])->name('ontmoeten.lobby.proposals');
    Route::post('ontmoeten/lobby/sync', [LobbyController::class, 'sync'])->name('ontmoeten.lobby.sync');
    Route::post('ontmoeten/lobby/chat', [LobbyController::class, 'chat'])->name('ontmoeten.lobby.chat');
    // Chess at the boards in the Hotel: queue per board (polled), NPC fallback, games (polled)
    Route::prefix('ontmoeten/schaken')->name('schaken.')->controller(ChessController::class)->group(function () {
        Route::post('zoeken', 'search')->name('search');
        Route::delete('zoeken', 'cancel')->name('cancel');
        Route::post('wachtrij', 'queue')->name('queue');
        Route::get('{chessGame}', 'show')->name('show');
        Route::post('{chessGame}/zet', 'move')->name('move');
        Route::post('{chessGame}/opgeven', 'resign')->name('resign');
        Route::post('{chessGame}/verlaten', 'leave')->name('leave');
    });
    // Tribekaarten at the card table in the Hotel: shared queue (polled), NPCs fill the table, games (polled)
    Route::prefix('ontmoeten/tribekaarten')->name('tribekaarten.')->controller(CardGameController::class)->group(function () {
        Route::get('tafel', 'table')->name('table');
        Route::post('zoeken', 'search')->name('search');
        Route::delete('zoeken', 'cancel')->name('cancel');
        Route::post('wachtrij', 'queue')->name('queue');
        Route::post('nu-starten', 'startNow')->name('start-now');
        Route::post('wachten', 'wait')->name('wait');
        Route::get('{cardGame}', 'show')->name('show');
        Route::post('{cardGame}/leggen', 'play')->name('play');
        Route::post('{cardGame}/pakken', 'draw')->name('draw');
        Route::post('{cardGame}/passen', 'pass')->name('pass');
        Route::post('{cardGame}/laatste', 'last')->name('last');
        Route::post('{cardGame}/opgeven', 'resign')->name('resign');
        Route::post('{cardGame}/verlaten', 'leave')->name('leave');
    });
    // Arcade cabinets in the Hotel (config/arcade.php): the game runs in the browser, the server keeps the scores
    Route::prefix('ontmoeten/arcade/{game}')->name('arcade.')->controller(ArcadeController::class)
        ->where(['game' => '[a-z0-9-]+'])->group(function () {
            Route::get('/', 'show')->name('show');
            Route::get('scores', 'scores')->name('scores');
            Route::post('start', 'start')->middleware('throttle:30,1')->name('start');
            Route::post('runs/{run}', 'finish')->middleware('throttle:30,1')->name('finish');
        });

    // Feed: only your own posts and those of your friends
    Route::get('feed', [FeedController::class, 'index'])->name('feed');
    Route::post('feed', [FeedController::class, 'store'])->name('feed.store');
    Route::patch('feed/{post}', [FeedController::class, 'update'])->name('feed.update');
    Route::delete('feed/{post}', [FeedController::class, 'destroy'])->name('feed.destroy');
    Route::post('feed/{post}/like', [FeedController::class, 'toggleLike'])->name('feed.like');
    Route::post('feed/{post}/comments', [FeedController::class, 'comment'])->name('feed.comments.store');
    Route::get('feed/{post}', [FeedController::class, 'show'])->whereNumber('post')->name('feed.show');
    Route::inertia('feed/nieuw', 'feed/create')->name('feed.create');
    Route::get('profile', [ProfileController::class, 'show'])->name('profile.show');
    // Profiel delen (Figma 3.3), /profile/share?user={id}. Placeholder until the backend adds a controller
    // that sends `partner`, `mine`, `theirs`, `partnerContact` and `saveUrl`.
    Route::inertia('profile/share', 'profile/share')->name('profile.share');
    // Profiel van een ander (Figma 3.4), alleen de gedeelde onderdelen. Placeholder until the backend adds a controller.
    Route::inertia('profile/{user}', 'profile/partner')->whereNumber('user')->name('profile.partner');
});

require __DIR__.'/settings.php';
