<?php

namespace App\Games\Cards;

use RuntimeException;

/** A move the rules don't allow; the message is shown to the player. */
class IllegalMove extends RuntimeException {}
