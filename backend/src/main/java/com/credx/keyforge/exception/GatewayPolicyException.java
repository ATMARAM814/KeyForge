package com.credx.keyforge.exception;

import lombok.Getter;

@Getter
public class GatewayPolicyException extends RuntimeException {
    private final int status;
    private final String errorCode;

    public GatewayPolicyException(int status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }
}
