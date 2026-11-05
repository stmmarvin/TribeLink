<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VerifyCodeController extends Controller
{
    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ], [
            'code.required' => 'Vul de 6-cijferige code in.',
            'code.size' => 'De code moet exact 6 cijfers lang zijn.',
        ]);

        $user = $request->user();

        if (
            ! $user->verification_code ||
            $user->verification_code !== $request->code ||
            now()->isAfter($user->verification_code_expires_at)
        ) {
            throw ValidationException::withMessages([
                'code' => ['De verificatiecode is onjuist of verlopen.'],
            ]);
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'verification_code' => null,
            'verification_code_expires_at' => null,
        ])->save();

        // New here: first make your avatar, then you walk straight into the Hotel
        if ($user->hotel_look === null) {
            return redirect()->route('hotel.avatar');
        }

        return redirect()->intended('/dashboard');
    }

    public function resend(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended('/dashboard');
        }

        $user->generateVerificationCode();

        return back()->with('status', 'code-sent');
    }
}
