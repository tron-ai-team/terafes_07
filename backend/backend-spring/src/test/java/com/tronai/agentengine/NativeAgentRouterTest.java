package com.tronai.agentengine;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NativeAgentRouterTest {

    private final NativeAgentRouter router = new NativeAgentRouter();

    @Test
    void codingGoalsRouteToOpenCode() {
        assertThat(router.route("Create a React Vite app with tests")).isEqualTo(NativeAgentRouter.RouteKind.CODING);
        assertThat(router.route("Fix the Maven build")).isEqualTo(NativeAgentRouter.RouteKind.CODING);
    }

    @Test
    void browserGoalsRouteToOpenClaw() {
        assertThat(router.route("Open https://example.com and take a screenshot"))
                .isEqualTo(NativeAgentRouter.RouteKind.AUTOMATION);
        assertThat(router.route("Use the browser to navigate to the docs site"))
                .isEqualTo(NativeAgentRouter.RouteKind.AUTOMATION);
    }
}
