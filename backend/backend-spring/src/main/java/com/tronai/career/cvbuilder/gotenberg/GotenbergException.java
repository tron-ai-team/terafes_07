package com.tronai.career.cvbuilder.gotenberg;

/**
 * Raised when Gotenberg is unreachable or returns an invalid PDF.
 * Message is safe for API clients (no CV content).
 */
public class GotenbergException extends RuntimeException {

    public enum Kind {
        UNAVAILABLE,
        CONVERSION_FAILED,
        INVALID_RESPONSE
    }

    private final Kind kind;

    public GotenbergException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    public GotenbergException(Kind kind, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
    }

    public Kind getKind() {
        return kind;
    }

    public boolean isUnavailable() {
        return kind == Kind.UNAVAILABLE;
    }
}
