<?php

namespace App\Http\Controllers;

use App\Models\LobbyInvite;
use App\Models\LobbyPresence;
use App\Models\User;
use App\Notifications\GameInvitationNotification;
use App\Notifications\InviteLinkUsedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class LobbyInviteController extends Controller
{
    private const ROOMS = [
        'kantine',
        'spelletjeshoek',
        'rustige-lounge',
        'eerstejaars-hal',
    ];

    public function createLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'string', 'in:'.implode(',', self::ROOMS)],
        ]);

        $invite = LobbyInvite::create([
            'inviter_id' => $request->user()->id,
            'room_id' => $validated['room_id'],
            'token' => Str::random(48),
            'expires_at' => now()->addHours(24),
        ]);

        return response()->json([
            'url' => url('/ontmoeten/invite/'.$invite->token),
            'expires_at' => $invite->expires_at->toISOString(),
        ]);
    }

    public function inviteFriend(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'string', 'in:'.implode(',', self::ROOMS)],
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $inviter = $request->user();
        $invitee = User::findOrFail($validated['user_id']);

        abort_if($inviter->is($invitee), 422, 'Je kunt jezelf niet uitnodigen.');
        abort_unless($inviter->isFriendsWith($invitee), 403, 'Nodig alleen een vriend uit.');

        $invite = LobbyInvite::create([
            'inviter_id' => $inviter->id,
            'invitee_id' => $invitee->id,
            'room_id' => $validated['room_id'],
            'token' => Str::random(48),
            'expires_at' => now()->addHours(24),
        ]);

        $invitee->notify(new GameInvitationNotification($invite));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Uitnodiging verstuurd naar @'.$invitee->username.'.',
        ]);

        return back();
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $invite = DB::transaction(function () use ($request, $token): LobbyInvite {
            $invite = LobbyInvite::query()
                ->where('token', $token)
                ->lockForUpdate()
                ->firstOrFail();

            abort_if($invite->used_at || $invite->expires_at->isPast(), 410, 'Deze uitnodiging is verlopen.');
            abort_if($invite->inviter_id === $request->user()->id, 422, 'Je kunt je eigen uitnodiging niet gebruiken.');
            abort_if($invite->invitee_id && $invite->invitee_id !== $request->user()->id, 403, 'Deze uitnodiging is niet voor jou.');

            $invite->update([
                'used_by_id' => $request->user()->id,
                'used_at' => now(),
            ]);

            LobbyPresence::updateOrCreate(
                ['user_id' => $request->user()->id],
                ['room_id' => $invite->room_id, 'last_seen_at' => now()],
            );

            $invite->load('usedBy');
            $invite->inviter->notify(new InviteLinkUsedNotification($invite));

            return $invite;
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Je bent toegevoegd aan de spelruimte.',
        ]);

        return redirect()->to('/ontmoeten/lobby?kamer='.urlencode($invite->room_id));
    }

    public function notifications(Request $request): JsonResponse
    {
        $notification = DB::transaction(function () use ($request): ?array {
            $notification = $request->user()->unreadNotifications()
                ->whereIn('type', [
                    GameInvitationNotification::class,
                    InviteLinkUsedNotification::class,
                ])
                ->latest()
                ->lockForUpdate()
                ->first();

            if (! $notification) {
                return null;
            }

            $payload = [
                'id' => $notification->id,
                'kind' => $notification->data['kind'] ?? 'game',
                'title' => $notification->data['title'] ?? 'Nieuwe melding',
                'message' => $notification->data['message'] ?? '',
                'roomId' => $notification->data['room_id'] ?? null,
                'inviteToken' => $notification->data['invite_token'] ?? null,
            ];

            $notification->markAsRead();

            return $payload;
        });

        return response()->json([
            'notifications' => $notification ? [$notification] : [],
        ]);
    }
}
