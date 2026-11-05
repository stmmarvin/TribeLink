<?php

namespace App\Models;

use App\Notifications\SendVerifyCodeNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $username
 * @property string $name
 * @property string|null $bio
 * @property string|null $avatar_path
 * @property-read string|null $avatar
 * @property string|null $banner_path
 * @property-read string|null $banner
 * @property array<string, mixed>|null $hotel_look
 * @property string $email
 * @property string|null $poster_message
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['username', 'name', 'bio', 'email', 'password', 'poster_message'])]
#[Hidden(['password', 'avatar_path', 'banner_path', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
#[Appends(['avatar', 'banner'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'verification_code_expires_at' => 'datetime',
            'hotel_look' => 'array',
        ];
    }

    /**
     * Public URL of the profile photo. Relative, so it works on any host.
     *
     * @return Attribute<string|null, never>
     */
    protected function avatar(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->avatar_path ? '/storage/'.$this->avatar_path : null);
    }

    /**
     * Public URL of the profile banner.
     *
     * @return Attribute<string|null, never>
     */
    protected function banner(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->banner_path ? '/storage/'.$this->banner_path : null);
    }

    public function sendEmailVerificationNotification()
    {
        $this->generateVerificationCode();
    }

    public function generateVerificationCode(): string
    {
        $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        $this->forceFill([
            'verification_code' => $code,
            'verification_code_expires_at' => now()->addMinutes(15),
        ])->save();

        $this->notify(new SendVerifyCodeNotification($code));

        return $code;
    }

    /**
     * Chats where the user is a participant
     *
     * @return BelongsToMany<Chat, $this>
     */
    public function chats(): BelongsToMany
    {
        return $this->belongsToMany(Chat::class, 'chat_participants')->withTimestamps();
    }

    /**
     * Accepted friends. An accepted friendship has a row in both directions,
     * so this relation works from either side.
     *
     * @return BelongsToMany<User, $this>
     */
    public function friends(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'user_friendships', 'user_id', 'friend_id')
            ->withPivot('accepted_at')
            ->wherePivotNotNull('accepted_at')
            ->withTimestamps();
    }

    /**
     * Ids of all accepted friends
     *
     * @return Collection<int, mixed>
     */
    public function friendIds(): Collection
    {
        return $this->friends()->pluck('users.id');
    }

    public function isFriendsWith(User $user): bool
    {
        return $this->friends()->whereKey($user->id)->exists();
    }

    /**
     * Open requests that other users sent to this user
     *
     * @return HasMany<Friendship, $this>
     */
    public function incomingFriendRequests(): HasMany
    {
        return $this->hasMany(Friendship::class, 'friend_id')->whereNull('accepted_at');
    }

    /**
     * Posts written by this user
     *
     * @return HasMany<Post, $this>
     */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    /**
     * @return HasOne<LobbyPresence, $this>
     */
    public function lobbyPresence(): HasOne
    {
        return $this->hasOne(LobbyPresence::class);
    }

    /**
     * @return BelongsToMany<Post, $this>
     */
    public function likedPosts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'post_likes')->withTimestamps();
    }
}
