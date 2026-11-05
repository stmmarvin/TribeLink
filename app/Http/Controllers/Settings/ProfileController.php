<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $user->fill($request->validated());

        $emailChanged = $user->isDirty('email');

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        // The new address has to be confirmed with a fresh code
        if ($emailChanged) {
            $user->sendEmailVerificationNotification();

            return to_route('verification.notice');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Store a new profile photo, replacing the old one.
     */
    public function updateAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $this->replaceImage($request->user(), 'avatar_path', $request->file('avatar'), 'avatars');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profielfoto opgeslagen.']);

        return to_route('profile.edit');
    }

    /**
     * Remove the profile photo.
     */
    public function destroyAvatar(Request $request): RedirectResponse
    {
        $this->removeImage($request->user(), 'avatar_path');

        return to_route('profile.edit');
    }

    /**
     * Store a new profile banner, replacing the old one.
     */
    public function updateBanner(Request $request): RedirectResponse
    {
        $request->validate([
            'banner' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $this->replaceImage($request->user(), 'banner_path', $request->file('banner'), 'banners');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Banner opgeslagen.']);

        return to_route('profile.edit');
    }

    /**
     * Remove the profile banner.
     */
    public function destroyBanner(Request $request): RedirectResponse
    {
        $this->removeImage($request->user(), 'banner_path');

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        Storage::disk('public')->delete(array_filter([$user->avatar_path, $user->banner_path]));

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Store an uploaded image on the public disk and delete the previous one.
     */
    private function replaceImage(User $user, string $column, UploadedFile $file, string $directory): void
    {
        $oldPath = $user->{$column};

        $user->{$column} = $file->store($directory, 'public');
        $user->save();

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }
    }

    private function removeImage(User $user, string $column): void
    {
        if (! $user->{$column}) {
            return;
        }

        Storage::disk('public')->delete($user->{$column});
        $user->{$column} = null;
        $user->save();
    }
}
