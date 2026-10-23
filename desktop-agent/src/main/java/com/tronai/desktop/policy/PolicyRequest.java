package com.tronai.desktop.policy;

import java.util.List;

/**
 * Deterministic policy input. Command text is tokenized; shell operators are rejected.
 */
public record PolicyRequest(
        String tool,
        String operation,
        String workspaceRoot,
        String workingDirectory,
        String path,
        String destinationPath,
        List<String> argv,
        String command,
        String url
) {
}

